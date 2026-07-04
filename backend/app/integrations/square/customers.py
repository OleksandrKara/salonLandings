import logging

from square import Square
from square.core.api_error import ApiError

from app.integrations.square.exceptions import SquareIntegrationError

logger = logging.getLogger(__name__)


class SquareCustomerGateway:
    """Finds or creates the Square Customer record backing a booking."""

    def __init__(self, client: Square):
        self._client = client

    def find_or_create(
        self,
        *,
        given_name: str,
        family_name: str,
        email_address: str,
        phone_number: str,
    ) -> str:
        existing_id = self._find_by_email(email_address)
        if existing_id:
            return existing_id

        try:
            response = self._client.customers.create(
                given_name=given_name,
                family_name=family_name,
                email_address=email_address,
                phone_number=phone_number,
                reference_id="mani-akluxnails-landing",
            )
        except ApiError as exc:
            logger.error("Square customer create failed: %s", exc.body)
            raise SquareIntegrationError("Unable to create customer record in Square", detail=exc.body) from exc

        return response.customer.id

    def _find_by_email(self, email_address: str) -> str | None:
        try:
            response = self._client.customers.search(
                query={"filter": {"email_address": {"exact": email_address}}}, limit=1
            )
        except ApiError as exc:
            logger.error("Square customer search failed: %s", exc.body)
            raise SquareIntegrationError("Unable to look up customer record in Square", detail=exc.body) from exc

        customers = response.customers or []
        return customers[0].id if customers else None
