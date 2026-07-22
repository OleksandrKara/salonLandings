import logging

from square import Square
from square.types.availability import Availability

from app.integrations.square.errors import SQUARE_CALL_ERRORS, square_error_detail
from app.integrations.square.exceptions import SquareIntegrationError

logger = logging.getLogger(__name__)


class SquareAvailabilityGateway:
    """Thin wrapper around Square's Bookings availability search.

    Deliberately uncached: availability changes continuously as other
    appointments are booked, so every call hits Square live.
    """

    def __init__(self, client: Square, location_id: str):
        self._client = client
        self._location_id = location_id

    def search(
        self,
        *,
        service_variation_ids: list[str],
        start_at: str,
        end_at: str,
        team_member_ids: list[str] | None = None,
    ) -> list[Availability]:
        """Search availability for one or more services performed back-to-back
        in a single appointment (e.g. manicure + pedicure). Square schedules
        multi-segment appointments with the same team member across all
        segments automatically.

        `team_member_ids`, when given, restricts results to that specific set
        (e.g. artists who can perform every selected segment).
        """
        segment_filters = []
        for variation_id in service_variation_ids:
            segment_filter: dict = {"service_variation_id": variation_id}
            if team_member_ids:
                segment_filter["team_member_id_filter"] = {"any": team_member_ids}
            segment_filters.append(segment_filter)

        try:
            response = self._client.bookings.search_availability(
                query={
                    "filter": {
                        "start_at_range": {"start_at": start_at, "end_at": end_at},
                        "location_id": self._location_id,
                        "segment_filters": segment_filters,
                    }
                }
            )
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            logger.error(
                "Square availability search failed for variations %s: %s",
                service_variation_ids, detail if detail is not None else exc,
            )
            raise SquareIntegrationError("Unable to load available appointment times from Square", detail=detail) from exc

        return response.availabilities or []
