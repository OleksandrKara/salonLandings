import logging

from square import Square
from square.core.api_error import ApiError
from square.types.business_booking_profile import BusinessBookingProfile
from square.types.location import Location

from app.core.cache import TTLCache
from app.integrations.square.exceptions import SquareIntegrationError

logger = logging.getLogger(__name__)

# Business/location metadata changes essentially never — cache for the process lifetime,
# refreshed hourly in case of edits in the Square dashboard.
_LONG_CACHE_SECONDS = 3600


class SquareBusinessRepository:
    """Read access to salon location details and booking policy."""

    def __init__(self, client: Square, location_id: str):
        self._client = client
        self._location_id = location_id
        self._location_cache: TTLCache[Location] = TTLCache(_LONG_CACHE_SECONDS)
        self._profile_cache: TTLCache[BusinessBookingProfile] = TTLCache(_LONG_CACHE_SECONDS)

    def _fetch_location(self) -> Location:
        try:
            response = self._client.locations.get(self._location_id)
        except ApiError as exc:
            logger.error("Square location lookup failed: %s", exc.body)
            raise SquareIntegrationError("Unable to load salon location details from Square", detail=exc.body) from exc
        return response.location

    def _fetch_booking_profile(self) -> BusinessBookingProfile:
        try:
            response = self._client.bookings.get_business_profile()
        except ApiError as exc:
            logger.error("Square business booking profile lookup failed: %s", exc.body)
            raise SquareIntegrationError("Unable to load booking policy from Square", detail=exc.body) from exc
        return response.business_booking_profile

    def get_location(self) -> Location:
        return self._location_cache.get_or_fetch(self._fetch_location)

    def get_booking_profile(self) -> BusinessBookingProfile:
        return self._profile_cache.get_or_fetch(self._fetch_booking_profile)
