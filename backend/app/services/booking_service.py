import logging
import uuid

from app.domain.schemas import BookingConfirmation, BookingRequest
from app.hooks.post_booking import run_post_booking_hooks
from app.integrations.square.bookings import SquareBookingGateway
from app.integrations.square.business import SquareBusinessRepository
from app.integrations.square.customers import SquareCustomerGateway
from app.services.artist_service import ArtistNotFoundError, ArtistService
from app.services.catalog_service import CatalogService

logger = logging.getLogger(__name__)


class InvalidSlotError(Exception):
    pass


class BookingService:
    def __init__(
        self,
        customer_gateway: SquareCustomerGateway,
        booking_gateway: SquareBookingGateway,
        catalog_service: CatalogService,
        artist_service: ArtistService,
        business_repo: SquareBusinessRepository,
    ):
        self._customer_gateway = customer_gateway
        self._booking_gateway = booking_gateway
        self._catalog_service = catalog_service
        self._artist_service = artist_service
        self._business_repo = business_repo

    def create_booking(self, request: BookingRequest) -> BookingConfirmation:
        offer = self._catalog_service.get_service_offer(request.slot.service_slug)
        tier_pricing = next(
            (tp for tp in offer.pricing if tp.variation_id == request.slot.service_variation_id), None
        )
        if tier_pricing is None:
            raise InvalidSlotError("The selected time slot no longer matches this service's pricing.")

        customer_id = self._customer_gateway.find_or_create(
            given_name=request.customer.given_name,
            family_name=request.customer.family_name,
            email_address=request.customer.email_address,
            phone_number=request.customer.phone_number,
        )

        booking = self._booking_gateway.create_booking(
            idempotency_key=str(uuid.uuid4()),
            customer_id=customer_id,
            start_at=request.slot.start_at,
            service_variation_id=request.slot.service_variation_id,
            service_variation_version=request.slot.service_variation_version,
            team_member_id=request.slot.team_member_id,
            duration_minutes=tier_pricing.duration_minutes,
            customer_note=request.note,
        )

        try:
            artist = self._artist_service.get_artist(request.slot.team_member_id, [offer])
            artist_name = artist.display_name
        except ArtistNotFoundError:
            artist_name = None

        location = self._business_repo.get_location()
        profile = self._business_repo.get_booking_profile()
        address = location.address
        address_line = ", ".join(
            part
            for part in [
                address.address_line1 if address else None,
                address.locality if address else None,
                " ".join(filter(None, [address.administrative_district_level1, address.postal_code])) if address else None,
            ]
            if part
        )

        confirmation = BookingConfirmation(
            booking_id=booking.id,
            status=booking.status,
            start_at=booking.start_at,
            service_name=offer.name,
            tier=tier_pricing.tier,
            artist_name=artist_name,
            price=tier_pricing.price,
            location_name=location.name or location.business_name or "AK.LUX.NAILS",
            location_address=address_line,
            location_phone=location.phone_number,
            cancellation_policy_text=(
                profile.business_appointment_settings.cancellation_policy_text
                if profile and profile.business_appointment_settings
                else None
            ),
        )

        run_post_booking_hooks(confirmation, request.customer)
        return confirmation
