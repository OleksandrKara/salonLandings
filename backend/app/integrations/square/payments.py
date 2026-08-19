import logging

from square import Square
from square.types.payment import Payment

from app.integrations.square.errors import SQUARE_CALL_ERRORS, square_error_detail
from app.integrations.square.exceptions import SquareIntegrationError

logger = logging.getLogger(__name__)


class PaymentDeclinedError(SquareIntegrationError):
    """The card was genuinely declined (or otherwise rejected) — distinct from a transient/
    integration failure, since the deposit-first flow (app.services.deposit_service) shows this
    one as a normal "try a different card" message rather than a generic error."""

    def __init__(self, message: str = "Your card was declined. Please try a different card.", *, detail: object | None = None):
        super().__init__(message, status_code=402, detail=detail)


_DECLINE_ERROR_CODES = {"CARD_DECLINED", "CVV_FAILURE", "ADDRESS_VERIFICATION_FAILURE",
                         "INVALID_EXPIRATION", "INSUFFICIENT_FUNDS", "CARD_EXPIRED"}


class SquarePaymentGateway:
    """Real card charges — used only for the PMU deposit-first flow (app.services.deposit_service).
    Every other booking in this app (mani, PMU consultations) never touches this — see
    create_booking's own docs for why.
    """

    def __init__(self, client: Square, location_id: str):
        self._client = client
        self._location_id = location_id

    def charge(
        self,
        *,
        idempotency_key: str,
        source_id: str,
        amount_cents: int,
        customer_id: str,
        note: str,
    ) -> Payment:
        try:
            response = self._client.payments.create(
                source_id=source_id,
                idempotency_key=idempotency_key,
                amount_money={"amount": amount_cents, "currency": "USD"},
                location_id=self._location_id,
                customer_id=customer_id,
                note=note,
                autocomplete=True,
            )
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            error_codes = {e.get("code") for e in (detail or {}).get("errors", [])} if isinstance(detail, dict) else set()
            logger.error("Square payment create failed: %s", detail if detail is not None else exc)
            if error_codes & _DECLINE_ERROR_CODES:
                raise PaymentDeclinedError(detail=detail) from exc
            raise SquareIntegrationError("Unable to process payment", detail=detail) from exc

        return response.payment
