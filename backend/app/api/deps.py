from functools import lru_cache

from fastapi import Depends

from app.core.business_context import BusinessContext, get_current_business
from app.core.config import get_settings
from app.integrations.marketing_db.repository import MarketingRepository
from app.integrations.square.availability import SquareAvailabilityGateway
from app.integrations.square.bookings import SquareBookingGateway
from app.integrations.square.business import SquareBusinessRepository
from app.integrations.square.catalog import SquareCatalogRepository
from app.integrations.square.client import get_square_client
from app.integrations.square.credentials import get_square_credentials
from app.integrations.square.customer_attributes import SquareCustomerAttributesGateway
from app.integrations.square.customers import SquareCustomerGateway
from app.integrations.square.payments import SquarePaymentGateway
from app.integrations.square.team import SquareTeamRepository
from app.services.abuse_guard import AbuseGuard
from app.services.artist_service import ArtistService
from app.services.availability_service import AvailabilityService
from app.services.booking_service import BookingService
from app.services.catalog_service import CatalogService
from app.services.experiment_service import ExperimentService
from app.services.pmu_service import PmuAvailabilityService, PmuBookingService, PmuCatalogService
from app.services.tracking_service import TrackingService

# Every factory below used to be a single process-wide @lru_cache singleton, built once from the
# global Settings. Multi-tenant support (2026-08-19, see docs/multi-tenant-akpmu-design.md) needs
# one Square client/gateway/service instance PER BUSINESS instead — each `get_x` FastAPI
# dependency below now takes `business: BusinessContext = Depends(get_current_business)` (resolved
# from the request's Host header) and delegates to an `_x_for(business_id, ...)` helper that's
# still @lru_cache'd, just keyed on business_id (and any other business-invariant args) instead of
# nothing. Route signatures (`Depends(get_availability_service)` etc.) are unchanged — FastAPI
# resolves the whole sub-dependency chain automatically.


@lru_cache
def _catalog_repository_for(business_id: int, cache_ttl_seconds: float) -> SquareCatalogRepository:
    return SquareCatalogRepository(get_square_client(business_id), cache_ttl_seconds=cache_ttl_seconds)


def get_catalog_repository(business: BusinessContext = Depends(get_current_business)) -> SquareCatalogRepository:
    settings = get_settings()
    return _catalog_repository_for(business.id, settings.catalog_cache_seconds)


@lru_cache
def _team_repository_for(business_id: int, location_id: str, cache_ttl_seconds: float) -> SquareTeamRepository:
    return SquareTeamRepository(get_square_client(business_id), location_id=location_id, cache_ttl_seconds=cache_ttl_seconds)


def get_team_repository(business: BusinessContext = Depends(get_current_business)) -> SquareTeamRepository:
    settings = get_settings()
    creds = get_square_credentials(business.id)
    return _team_repository_for(business.id, creds.location_id, settings.catalog_cache_seconds)


@lru_cache
def _business_repository_for(business_id: int, location_id: str) -> SquareBusinessRepository:
    return SquareBusinessRepository(get_square_client(business_id), location_id=location_id)


def get_business_repository(business: BusinessContext = Depends(get_current_business)) -> SquareBusinessRepository:
    creds = get_square_credentials(business.id)
    return _business_repository_for(business.id, creds.location_id)


@lru_cache
def _availability_gateway_for(business_id: int, location_id: str) -> SquareAvailabilityGateway:
    return SquareAvailabilityGateway(get_square_client(business_id), location_id=location_id)


def get_availability_gateway(business: BusinessContext = Depends(get_current_business)) -> SquareAvailabilityGateway:
    creds = get_square_credentials(business.id)
    return _availability_gateway_for(business.id, creds.location_id)


@lru_cache
def _customer_gateway_for(business_id: int) -> SquareCustomerGateway:
    return SquareCustomerGateway(get_square_client(business_id))


def get_customer_gateway(business: BusinessContext = Depends(get_current_business)) -> SquareCustomerGateway:
    return _customer_gateway_for(business.id)


@lru_cache
def _customer_attributes_gateway_for(business_id: int) -> SquareCustomerAttributesGateway:
    return SquareCustomerAttributesGateway(get_square_client(business_id))


def get_customer_attributes_gateway(
    business: BusinessContext = Depends(get_current_business),
) -> SquareCustomerAttributesGateway:
    return _customer_attributes_gateway_for(business.id)


@lru_cache
def _booking_gateway_for(business_id: int, location_id: str) -> SquareBookingGateway:
    return SquareBookingGateway(get_square_client(business_id), location_id=location_id)


def get_booking_gateway(business: BusinessContext = Depends(get_current_business)) -> SquareBookingGateway:
    creds = get_square_credentials(business.id)
    return _booking_gateway_for(business.id, creds.location_id)


@lru_cache
def _catalog_service_for(business_id: int, catalog_repository: SquareCatalogRepository) -> CatalogService:
    return CatalogService(catalog_repository)


def get_catalog_service(
    business: BusinessContext = Depends(get_current_business),
    catalog_repository: SquareCatalogRepository = Depends(get_catalog_repository),
) -> CatalogService:
    return _catalog_service_for(business.id, catalog_repository)


@lru_cache
def _artist_service_for(business_id: int, team_repository: SquareTeamRepository) -> ArtistService:
    return ArtistService(team_repository)


def get_artist_service(
    business: BusinessContext = Depends(get_current_business),
    team_repository: SquareTeamRepository = Depends(get_team_repository),
) -> ArtistService:
    return _artist_service_for(business.id, team_repository)


@lru_cache
def _availability_service_for(
    business_id: int,
    availability_gateway: SquareAvailabilityGateway,
    catalog_service: CatalogService,
    artist_service: ArtistService,
) -> AvailabilityService:
    return AvailabilityService(availability_gateway, catalog_service, artist_service)


def get_availability_service(
    business: BusinessContext = Depends(get_current_business),
    availability_gateway: SquareAvailabilityGateway = Depends(get_availability_gateway),
    catalog_service: CatalogService = Depends(get_catalog_service),
    artist_service: ArtistService = Depends(get_artist_service),
) -> AvailabilityService:
    return _availability_service_for(business.id, availability_gateway, catalog_service, artist_service)


@lru_cache
def _booking_service_for(
    business_id: int,
    customer_gateway: SquareCustomerGateway,
    booking_gateway: SquareBookingGateway,
    catalog_service: CatalogService,
    artist_service: ArtistService,
    business_repository: SquareBusinessRepository,
    customer_attributes_gateway: SquareCustomerAttributesGateway,
) -> BookingService:
    return BookingService(
        customer_gateway, booking_gateway, catalog_service, artist_service, business_repository, customer_attributes_gateway
    )


def get_booking_service(
    business: BusinessContext = Depends(get_current_business),
    customer_gateway: SquareCustomerGateway = Depends(get_customer_gateway),
    booking_gateway: SquareBookingGateway = Depends(get_booking_gateway),
    catalog_service: CatalogService = Depends(get_catalog_service),
    artist_service: ArtistService = Depends(get_artist_service),
    business_repository: SquareBusinessRepository = Depends(get_business_repository),
    customer_attributes_gateway: SquareCustomerAttributesGateway = Depends(get_customer_attributes_gateway),
) -> BookingService:
    return _booking_service_for(
        business.id,
        customer_gateway,
        booking_gateway,
        catalog_service,
        artist_service,
        business_repository,
        customer_attributes_gateway,
    )


# --- AK PMU (see app.domain.pmu_catalog / app.services.pmu_service) ---


@lru_cache
def _pmu_catalog_service_for(business_id: int, catalog_repository: SquareCatalogRepository) -> PmuCatalogService:
    return PmuCatalogService(catalog_repository, business_id)


def get_pmu_catalog_service(
    business: BusinessContext = Depends(get_current_business),
    catalog_repository: SquareCatalogRepository = Depends(get_catalog_repository),
) -> PmuCatalogService:
    return _pmu_catalog_service_for(business.id, catalog_repository)


@lru_cache
def _pmu_availability_service_for(
    business_id: int, availability_gateway: SquareAvailabilityGateway, team_repository: SquareTeamRepository
) -> PmuAvailabilityService:
    return PmuAvailabilityService(availability_gateway, team_repository)


def get_pmu_availability_service(
    business: BusinessContext = Depends(get_current_business),
    availability_gateway: SquareAvailabilityGateway = Depends(get_availability_gateway),
    team_repository: SquareTeamRepository = Depends(get_team_repository),
) -> PmuAvailabilityService:
    return _pmu_availability_service_for(business.id, availability_gateway, team_repository)


@lru_cache
def _payment_gateway_for(business_id: int, location_id: str) -> SquarePaymentGateway:
    return SquarePaymentGateway(get_square_client(business_id), location_id=location_id)


def get_payment_gateway(business: BusinessContext = Depends(get_current_business)) -> SquarePaymentGateway:
    creds = get_square_credentials(business.id)
    return _payment_gateway_for(business.id, creds.location_id)


@lru_cache
def _pmu_booking_service_for(
    business_id: int,
    customer_gateway: SquareCustomerGateway,
    booking_gateway: SquareBookingGateway,
    payment_gateway: SquarePaymentGateway,
    catalog_repository: SquareCatalogRepository,
    team_repository: SquareTeamRepository,
    customer_attributes_gateway: SquareCustomerAttributesGateway,
) -> PmuBookingService:
    return PmuBookingService(
        customer_gateway, booking_gateway, payment_gateway, catalog_repository, team_repository, customer_attributes_gateway
    )


def get_pmu_booking_service(
    business: BusinessContext = Depends(get_current_business),
    customer_gateway: SquareCustomerGateway = Depends(get_customer_gateway),
    booking_gateway: SquareBookingGateway = Depends(get_booking_gateway),
    payment_gateway: SquarePaymentGateway = Depends(get_payment_gateway),
    catalog_repository: SquareCatalogRepository = Depends(get_catalog_repository),
    team_repository: SquareTeamRepository = Depends(get_team_repository),
    customer_attributes_gateway: SquareCustomerAttributesGateway = Depends(get_customer_attributes_gateway),
) -> PmuBookingService:
    return _pmu_booking_service_for(
        business.id,
        customer_gateway,
        booking_gateway,
        payment_gateway,
        catalog_repository,
        team_repository,
        customer_attributes_gateway,
    )


# Marketing (tracking/experiments/abuse-guard) stays a single process-wide singleton for now —
# marketing.* tables gained a business_id column in Phase 1 (see docs/multi-tenant-akpmu-design.md)
# but nothing reads/writes it yet; that's the next slice of this work, not this one.
@lru_cache
def get_marketing_repository() -> MarketingRepository:
    return MarketingRepository()


@lru_cache
def get_tracking_service() -> TrackingService:
    return TrackingService(get_marketing_repository())


@lru_cache
def get_experiment_service() -> ExperimentService:
    return ExperimentService(get_marketing_repository())


@lru_cache
def get_abuse_guard() -> AbuseGuard:
    return AbuseGuard(get_marketing_repository())
