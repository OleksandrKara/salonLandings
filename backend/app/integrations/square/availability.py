import logging

from square import Square
from square.core.api_error import ApiError
from square.types.availability import Availability

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
        service_variation_id: str,
        start_at: str,
        end_at: str,
        team_member_id: str | None = None,
    ) -> list[Availability]:
        segment_filter: dict = {"service_variation_id": service_variation_id}
        if team_member_id:
            segment_filter["team_member_id_filter"] = {"any": [team_member_id]}

        try:
            response = self._client.bookings.search_availability(
                query={
                    "filter": {
                        "start_at_range": {"start_at": start_at, "end_at": end_at},
                        "location_id": self._location_id,
                        "segment_filters": [segment_filter],
                    }
                }
            )
        except ApiError as exc:
            logger.error(
                "Square availability search failed for variation %s: %s", service_variation_id, exc.body
            )
            raise SquareIntegrationError("Unable to load available appointment times from Square", detail=exc.body) from exc

        return response.availabilities or []
