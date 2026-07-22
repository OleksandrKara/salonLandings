import logging

from square import Square

from app.domain.schemas import TrackingSnapshot
from app.integrations.square.errors import SQUARE_CALL_ERRORS, square_error_detail, square_error_status_code
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
    {
        "key": "sms_marketing_consent",
        "name": "SMS Marketing Consent",
        "description": "Whether this customer opted in to SMS marketing on their most recent booking. Convenience mirror only — the authoritative, timestamped consent/revocation record lives in the marketing database (Square has no API for SMS consent).",
    },
    {
        "key": "email_marketing_consent",
        "name": "Email Marketing Consent",
        "description": "Email marketing consent, granted automatically on every booking (independent of the SMS choice). Convenience mirror only — Square's own email_unsubscribed field is read-only via the API, so the marketing database is the actual record.",
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
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            logger.error("Failed to list Square customer custom attribute definitions: %s", detail if detail is not None else exc)
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
            except SQUARE_CALL_ERRORS as exc:
                detail = square_error_detail(exc)
                logger.error(
                    "Failed to create Square customer custom attribute definition '%s': %s",
                    definition["key"], detail if detail is not None else exc,
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
            except SQUARE_CALL_ERRORS as exc:
                detail = square_error_detail(exc)
                logger.error(
                    "Failed to set Square customer custom attribute '%s' for customer %s: %s",
                    key, customer_id, detail if detail is not None else exc,
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
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            logger.error(
                "Failed to set Square customer custom attribute 'original_organic_source' for customer %s: %s",
                customer_id,
                detail if detail is not None else exc,
            )

    def attach_sms_consent(self, customer_id: str, consented: bool) -> None:
        """Mirrors the current SMS marketing consent choice for staff visibility on the
        Square Dashboard. Overwritten on every booking to reflect the latest choice —
        unlike original_organic_source, this is deliberately NOT write-once, since a
        returning customer's consent can change. The marketing DB's sms_consent table
        stays the authoritative, append-only record regardless of what this shows.
        """
        value = "Opted In" if consented else "Opted Out"
        try:
            self._client.customers.custom_attributes.upsert(
                customer_id, "sms_marketing_consent", custom_attribute={"value": value}
            )
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            logger.error(
                "Failed to set Square customer custom attribute 'sms_marketing_consent' for customer %s: %s",
                customer_id,
                detail if detail is not None else exc,
            )

    def attach_email_consent(self, customer_id: str) -> None:
        """Always "Opted In" — email marketing consent is granted automatically on every
        booking today (see EMAIL_CONSENT_TEXT). Kept as its own method, not folded into
        attach_sms_consent, so this is trivial to make conditional later if a real opt-out
        control is ever added.
        """
        try:
            self._client.customers.custom_attributes.upsert(
                customer_id, "email_marketing_consent", custom_attribute={"value": "Opted In"}
            )
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            logger.error(
                "Failed to set Square customer custom attribute 'email_marketing_consent' for customer %s: %s",
                customer_id,
                detail if detail is not None else exc,
            )

    def _get_existing_original_source(self, customer_id: str) -> str | None:
        try:
            response = self._client.customers.custom_attributes.get(customer_id, "original_organic_source")
            return response.custom_attribute.value if response.custom_attribute else None
        except SQUARE_CALL_ERRORS as exc:
            if square_error_status_code(exc) == 404:
                return None
            # Ambiguous failure (rate limit, 5xx, transport failure, etc.) — fail safe by
            # treating it as "already set" so we never risk overwriting real first-touch data.
            detail = square_error_detail(exc)
            logger.error(
                "Failed to check existing 'original_organic_source' for customer %s: %s",
                customer_id, detail if detail is not None else exc,
            )
            return "unknown"
