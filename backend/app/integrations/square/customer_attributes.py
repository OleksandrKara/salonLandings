import logging

from square import Square
from square.core.api_error import ApiError

from app.domain.schemas import TrackingSnapshot
from app.services.traffic_source import classify_traffic_source

logger = logging.getLogger(__name__)

# Square's Custom Attributes API has no native "string" type — attribute values
# are validated against a JSON schema, and this $ref is Square's own hosted
# definition for a plain string value.
_STRING_SCHEMA = {"$ref": "https://developer-production-s.squarecdn.com/schemas/v1/common.json#squareup.common.String"}

_DEFINITIONS = [
    {
        "key": "marketing_traffic_source",
        "name": "Marketing Traffic Source",
        "description": "Where this customer's booking came from (ad campaign, organic search, referral, etc), auto-detected from the landing page. Separate from the manual 'Traffic Source' dropdown.",
    },
    {
        "key": "utm_source",
        "name": "UTM Source",
        "description": "Raw utm_source param from the landing page URL that led to this booking. Set automatically.",
    },
    {
        "key": "utm_medium",
        "name": "UTM Medium",
        "description": "Raw utm_medium param from the landing page URL that led to this booking. Set automatically.",
    },
    {
        "key": "utm_campaign",
        "name": "UTM Campaign",
        "description": "Raw utm_campaign param from the landing page URL that led to this booking. Set automatically.",
    },
    {
        "key": "original_organic_source",
        "name": "Original Traffic Source",
        "description": "The first traffic source ever detected for this customer. Set once and never overwritten by later visits — unlike Marketing Traffic Source, which reflects the most recent booking. 'na' means no source could be detected the first time this was recorded.",
    },
]


class SquareCustomerAttributesGateway:
    """Pushes marketing attribution onto the Square customer record via Custom
    Attributes — Square's core Customer object has no built-in fields for
    traffic source / UTM data, so these show up on the customer's Square
    Dashboard profile as read-only custom fields instead.
    """

    def __init__(self, client: Square):
        self._client = client

    def ensure_definitions(self) -> None:
        """Idempotent one-time setup — safe to call on every process start."""
        try:
            existing_keys = {d.key for d in self._client.customers.custom_attribute_definitions.list()}
        except ApiError as exc:
            logger.error("Failed to list Square customer custom attribute definitions: %s", exc.body)
            return

        for definition in _DEFINITIONS:
            if definition["key"] in existing_keys:
                continue
            try:
                self._client.customers.custom_attribute_definitions.create(
                    custom_attribute_definition={
                        "key": definition["key"],
                        "name": definition["name"],
                        "description": definition["description"],
                        "schema": _STRING_SCHEMA,
                        "visibility": "VISIBILITY_READ_ONLY",
                    }
                )
                logger.info("Created Square customer custom attribute definition '%s'", definition["key"])
            except ApiError as exc:
                logger.error(
                    "Failed to create Square customer custom attribute definition '%s': %s", definition["key"], exc.body
                )

    def attach_tracking(self, customer_id: str, tracking: TrackingSnapshot | None) -> None:
        """Fire-and-forget: a failed attribute write must never block the booking itself."""
        values = {
            "marketing_traffic_source": classify_traffic_source(tracking),
            "utm_source": tracking.utm_source if tracking else None,
            "utm_medium": tracking.utm_medium if tracking else None,
            "utm_campaign": tracking.utm_campaign if tracking else None,
        }
        for key, value in values.items():
            if value is None:
                continue
            try:
                self._client.customers.custom_attributes.upsert(customer_id, key, custom_attribute={"value": value})
            except ApiError as exc:
                logger.error(
                    "Failed to set Square customer custom attribute '%s' for customer %s: %s", key, customer_id, exc.body
                )

        self._attach_original_source_once(customer_id, tracking)

    def _attach_original_source_once(self, customer_id: str, tracking: TrackingSnapshot | None) -> None:
        """Write-once: locks in the first known traffic source for this customer.
        Existing customers who already have a value here (from an earlier visit,
        possibly before this field existed) are never overwritten — a returning
        customer's later ad-driven visits shouldn't erase how they first found us.
        """
        if self._get_existing_original_source(customer_id) is not None:
            return

        value = classify_traffic_source(tracking) if tracking is not None else "na"
        try:
            self._client.customers.custom_attributes.upsert(
                customer_id, "original_organic_source", custom_attribute={"value": value}
            )
        except ApiError as exc:
            logger.error(
                "Failed to set Square customer custom attribute 'original_organic_source' for customer %s: %s",
                customer_id,
                exc.body,
            )

    def _get_existing_original_source(self, customer_id: str) -> str | None:
        try:
            response = self._client.customers.custom_attributes.get(customer_id, "original_organic_source")
            return response.custom_attribute.value if response.custom_attribute else None
        except ApiError as exc:
            if exc.status_code == 404:
                return None
            # Ambiguous failure (rate limit, 5xx, etc.) — fail safe by treating
            # it as "already set" so we never risk overwriting real first-touch data.
            logger.error(
                "Failed to check existing 'original_organic_source' for customer %s: %s", customer_id, exc.body
            )
            return "unknown"
