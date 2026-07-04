import logging

from square import Square
from square.core.api_error import ApiError
from square.types.booking import Booking

from app.integrations.square.exceptions import SlotNoLongerAvailableError, SquareIntegrationError

logger = logging.getLogger(__name__)

# Square rejects a booking whose slot was taken between availability search and
# create — surfaced to callers as a clean 409 rather than a generic 502.
_CONFLICT_ERROR_CODES = {"CONFLICTING_APPOINTMENT", "BOOKING_TIME_NOT_AVAILABLE"}


class SquareBookingGateway:
    def __init__(self, client: Square, location_id: str):
        self._client = client
        self._location_id = location_id

    def create_booking(
        self,
        *,
        idempotency_key: str,
        customer_id: str,
        start_at: str,
        service_variation_id: str,
        service_variation_version: int,
        team_member_id: str,
        duration_minutes: int,
        customer_note: str | None = None,
    ) -> Booking:
        try:
            response = self._client.bookings.create(
                idempotency_key=idempotency_key,
                booking={
                    "start_at": start_at,
                    "location_id": self._location_id,
                    "customer_id": customer_id,
                    "customer_note": customer_note,
                    "appointment_segments": [
                        {
                            "duration_minutes": duration_minutes,
                            "service_variation_id": service_variation_id,
                            "service_variation_version": service_variation_version,
                            "team_member_id": team_member_id,
                        }
                    ],
                },
            )
        except ApiError as exc:
            error_codes = {e.get("code") for e in (exc.body or {}).get("errors", [])} if isinstance(exc.body, dict) else set()
            logger.error("Square booking create failed: %s", exc.body)
            if error_codes & _CONFLICT_ERROR_CODES:
                raise SlotNoLongerAvailableError(detail=exc.body) from exc
            raise SquareIntegrationError("Unable to create appointment in Square", detail=exc.body) from exc

        return response.booking
