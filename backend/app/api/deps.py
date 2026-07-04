from functools import lru_cache

from app.core.config import get_settings
from app.integrations.marketing_db.repository import MarketingRepository
from app.integrations.square.availability import SquareAvailabilityGateway
from app.integrations.square.bookings import SquareBookingGateway
from app.integrations.square.business import SquareBusinessRepository
from app.integrations.square.catalog import SquareCatalogRepository
from app.integrations.square.client import get_square_client
from app.integrations.square.customers import SquareCustomerGateway
from app.integrations.square.team import SquareTeamRepository
from app.services.artist_service import ArtistService
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService
from app.services.catalog_service import CatalogService
from app.services.tracking_service import TrackingService


@lru_cache
def get_catalog_repository() -> SquareCatalogRepository:
    settings = get_settings()
    return SquareCatalogRepository(get_square_client(), cache_ttl_seconds=settings.catalog_cache_seconds)


@lru_cache
def get_team_repository() -> SquareTeamRepository:
    settings = get_settings()
    return SquareTeamRepository(
        get_square_client(), location_id=settings.square_location_id, cache_ttl_seconds=settings.catalog_cache_seconds
    )


@lru_cache
def get_business_repository() -> SquareBusinessRepository:
    settings = get_settings()
    return SquareBusinessRepository(get_square_client(), location_id=settings.square_location_id)


@lru_cache
def get_availability_gateway() -> SquareAvailabilityGateway:
    settings = get_settings()
    return SquareAvailabilityGateway(get_square_client(), location_id=settings.square_location_id)


@lru_cache
def get_customer_gateway() -> SquareCustomerGateway:
    return SquareCustomerGateway(get_square_client())


@lru_cache
def get_booking_gateway() -> SquareBookingGateway:
    settings = get_settings()
    return SquareBookingGateway(get_square_client(), location_id=settings.square_location_id)


@lru_cache
def get_catalog_service() -> CatalogService:
    return CatalogService(get_catalog_repository())


@lru_cache
def get_artist_service() -> ArtistService:
    return ArtistService(get_team_repository())


@lru_cache
def get_availability_service() -> AvailabilityService:
    return AvailabilityService(get_availability_gateway(), get_catalog_service(), get_artist_service())


@lru_cache
def get_booking_service() -> BookingService:
    return BookingService(
        get_customer_gateway(),
        get_booking_gateway(),
        get_catalog_service(),
        get_artist_service(),
        get_business_repository(),
        get_availability_gateway(),
    )


@lru_cache
def get_marketing_repository() -> MarketingRepository:
    return MarketingRepository()


@lru_cache
def get_tracking_service() -> TrackingService:
    return TrackingService(get_marketing_repository())
