import logging
import re

from square import Square
from square.core.api_error import ApiError
from square.customers.client import OMIT

from app.integrations.square.exceptions import SquareIntegrationError

logger = logging.getLogger(__name__)


def normalize_phone_e164(phone_number: str) -> str | None:
    """Square stores/matches phone numbers in E.164 (e.g. "+18585550100") regardless of how a
    customer was entered on Square's own side — our own capture form only ever collects a
    10-digit US number, so this is the one conversion needed for search to actually hit.
    Returns None for anything that isn't recognizably a US number, rather than guessing.
    """
    digits = re.sub(r"\D", "", phone_number)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return None


class SquareCustomerGateway:
    """Finds or creates the Square Customer record backing a booking."""

    def __init__(self, client: Square):
        self._client = client

    def find_existing(self, *, phone_number: str | None, email_address: str | None) -> str | None:
        """Read-only lookup for a lead that hasn't booked (yet) — never creates a customer.
        Never raises: a Square outage here must not affect lead capture, so any failure is
        logged and treated as "not found".
        """
        try:
            return self._search_by_phone_then_email(phone_number=phone_number, email_address=email_address)
        except ApiError as exc:
            logger.warning("Square customer lookup failed, treating as not found: %s", exc.body)
            return None

    def _search_by_phone_then_email(self, *, phone_number: str | None, email_address: str | None) -> str | None:
        """Tries phone first (always present at Step 1; a more stable identifier than email for
        this business), then falls back to email if phone didn't match — "smart" in the sense
        that it uses whichever signal actually finds the person, since either one might be the
        only thing that matches an existing Square profile. Shared by find_existing (Step 1
        lookup) and find_or_create (real booking) so both agree on the same existing customer —
        find_or_create used to only check email, which could create a duplicate Square customer
        for someone find_existing had already matched by phone, silently overwriting the
        contact's correct square_customer_id with the new duplicate's id.
        """
        if phone_number:
            e164 = normalize_phone_e164(phone_number)
            if e164:
                match = self._search(field="phone_number", value=e164)
                if match:
                    return match
        if email_address:
            match = self._search(field="email_address", value=email_address)
            if match:
                return match
        return None

    def _search(self, *, field: str, value: str) -> str | None:
        response = self._client.customers.search(query={"filter": {field: {"exact": value}}}, limit=1)
        customers = response.customers or []
        return customers[0].id if customers else None

    def find_or_create(
        self,
        *,
        given_name: str,
        family_name: str,
        email_address: str | None,
        phone_number: str,
    ) -> str:
        try:
            existing_id = self._search_by_phone_then_email(phone_number=phone_number, email_address=email_address)
        except ApiError as exc:
            logger.error("Square customer search failed: %s", exc.body)
            raise SquareIntegrationError("Unable to look up customer record in Square", detail=exc.body) from exc
        if existing_id:
            return existing_id

        try:
            response = self._client.customers.create(
                given_name=given_name,
                family_name=family_name,
                email_address=email_address if email_address is not None else OMIT,
                phone_number=phone_number,
                reference_id="mani-akluxnails-landing",
            )
        except ApiError as exc:
            logger.error("Square customer create failed: %s", exc.body)
            raise SquareIntegrationError("Unable to create customer record in Square", detail=exc.body) from exc

        return response.customer.id
