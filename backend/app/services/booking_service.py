import logging
import uuid

from app.domain.schemas import (
    ArtistTier,
    BookingConfirmation,
    BookingRequest,
    CartMenu,
    FourHandRequestConfirmation,
    FourHandRequestSubmission,
)
from app.domain.service_catalog import FOUR_HAND_REQUEST
from app.hooks.post_booking import run_post_booking_hooks
from app.integrations.square.bookings import BookingSegment, SquareBookingGateway
from app.integrations.square.business import SquareBusinessRepository
from app.integrations.square.customer_attributes import SquareCustomerAttributesGateway
from app.integrations.square.customers import SquareCustomerGateway
from app.integrations.sms.notifier import notify_four_hand_request_sms
from app.integrations.telegram.notifier import notify_four_hand_request
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
        customer_attributes_gateway: SquareCustomerAttributesGateway,
    ):
        self._customer_gateway = customer_gateway
        self._booking_gateway = booking_gateway
        self._catalog_service = catalog_service
        self._artist_service = artist_service
        self._business_repo = business_repo
        self._customer_attributes_gateway = customer_attributes_gateway

    def create_booking(self, request: BookingRequest) -> BookingConfirmation:
        cart_menu = self._catalog_service.get_cart_menu()
        resolved = [self._resolve_segment(cart_menu, s.service_slug, s.service_variation_id) for s in request.slot.segments]
        if not resolved:
            raise InvalidSlotError("No services selected.")

        customer_id = self._customer_gateway.find_or_create(
            given_name=request.customer.given_name,
            family_name=request.customer.family_name,
            email_address=request.customer.email_address,
            phone_number=request.customer.phone_number,
        )
        self._customer_attributes_gateway.attach_tracking(customer_id, request.tracking)
        self._customer_attributes_gateway.attach_sms_consent(customer_id, request.customer.marketing_opt_in)
        if request.customer.email_address is not None:
            self._customer_attributes_gateway.attach_email_consent(customer_id)

        booking = self._booking_gateway.create_booking(
            idempotency_key=str(uuid.uuid4()),
            customer_id=customer_id,
            start_at=request.slot.start_at,
            team_member_id=request.slot.team_member_id,
            segments=[
                BookingSegment(
                    service_variation_id=r["variation_id"],
                    service_variation_version=r["variation_version"],
                    duration_minutes=r["duration_minutes"],
                )
                for r in resolved
            ],
            customer_note=request.note,
        )

        try:
            artist_name = self._artist_service.get_artist(
                request.slot.team_member_id, [cart_menu.manicure, cart_menu.pedicure]
            ).display_name
        except ArtistNotFoundError:
            artist_name = None

        tier = next((r["tier"] for r in resolved if r["tier"] is not None), ArtistTier.TOP)
        total_price = sum(r["price"] for r in resolved)
        total_compare_at = sum(r["compare_at_price"] if r["compare_at_price"] is not None else r["price"] for r in resolved)
        total_duration = sum(r["duration_minutes"] for r in resolved)
        service_name = " + ".join(r["name"] for r in resolved)

        location = self._business_repo.get_location()
        profile = self._business_repo.get_booking_profile()
        address_line = self._format_address(location.address)

        confirmation = BookingConfirmation(
            booking_id=booking.id,
            status=booking.status,
            start_at=booking.start_at,
            duration_minutes=total_duration,
            service_name=service_name,
            tier=tier,
            artist_name=artist_name,
            price=total_price,
            compare_at_price=total_compare_at if total_compare_at != total_price else None,
            location_name=location.name or location.business_name or "AK.LUX.NAILS",
            location_address=address_line,
            location_phone=location.phone_number,
            cancellation_policy_text=(
                profile.business_appointment_settings.cancellation_policy_text
                if profile and profile.business_appointment_settings
                else None
            ),
            square_customer_id=customer_id,
        )

        run_post_booking_hooks(confirmation, request.customer)
        return confirmation

    def submit_four_hand_request(self, submission: FourHandRequestSubmission) -> FourHandRequestConfirmation:
        """The 4-hand path collects the customer's real preferred date/time (the same
        live-availability picker as a normal booking — see
        AvailabilityService._get_four_hand_availability) but deliberately does NOT create a Square
        appointment: a 4-hand visit needs two techs coordinated by staff, so the salon still calls
        to confirm. We capture the Square contact and alert the team on Telegram instead, so
        nothing has to be checked manually in Square to notice a new request came in.

        Trade-off: since no Square booking is created, there's no server-side re-check that the
        picked slot is still open by the time the request is submitted (previously, Square's own
        create_booking call was that safety net) — acceptable given staff always calls back to
        actually schedule this, per the confirmation message below.
        """
        customer_id = self._customer_gateway.find_or_create(
            given_name=submission.customer.given_name,
            family_name=submission.customer.family_name,
            email_address=submission.customer.email_address,
            phone_number=submission.customer.phone_number,
        )
        self._customer_attributes_gateway.attach_tracking(customer_id, submission.tracking)
        self._customer_attributes_gateway.attach_sms_consent(customer_id, submission.customer.marketing_opt_in)
        if submission.customer.email_address is not None:
            self._customer_attributes_gateway.attach_email_consent(customer_id)

        note_parts = []
        if submission.requested_services:
            note_parts.append(f"Requested: {submission.requested_services}")
        if submission.note:
            note_parts.append(submission.note)
        note = " — ".join(note_parts) or None

        # Not a real Square booking id — see FourHandRequestConfirmation.booking_id. Generated here
        # (rather than left null) so this request still counts in landing-page-variant
        # conversion/attribution reporting the same way a real booking would.
        request_id = f"four-hand-req-{uuid.uuid4()}"

        notify_four_hand_request(
            source="mani",
            customer_name=f"{submission.customer.given_name} {submission.customer.family_name}".strip(),
            phone_number=submission.customer.phone_number,
            requested_services=submission.requested_services,
            preferred_start_at=submission.slot.start_at,
            note=note,
        )
        notify_four_hand_request_sms(
            given_name=submission.customer.given_name,
            phone_number=submission.customer.phone_number,
            preferred_start_at=submission.slot.start_at,
        )

        return FourHandRequestConfirmation(
            booking_id=request_id,
            status="requested",
            service_name=FOUR_HAND_REQUEST.name,
            message="We've received your request and will call you shortly to confirm the exact date, time & final pricing.",
            square_customer_id=customer_id,
        )

    def _resolve_segment(self, cart_menu: CartMenu, service_slug: str, variation_id: str) -> dict:
        for offer in (cart_menu.manicure, cart_menu.pedicure):
            if offer.slug != service_slug:
                continue
            tier_pricing = next((p for p in offer.pricing if p.variation_id == variation_id), None)
            if tier_pricing is None:
                raise InvalidSlotError(f"'{service_slug}' pricing no longer matches variation '{variation_id}'.")
            return {
                "name": offer.name,
                "variation_id": tier_pricing.variation_id,
                "variation_version": tier_pricing.variation_version,
                "duration_minutes": tier_pricing.duration_minutes,
                "price": tier_pricing.price,
                "compare_at_price": tier_pricing.compare_at_price,
                "tier": tier_pricing.tier,
            }

        design = cart_menu.design_addon
        if service_slug == design.slug and variation_id == design.variation_id:
            return {
                "name": design.name,
                "variation_id": design.variation_id,
                "variation_version": design.variation_version,
                "duration_minutes": design.duration_minutes,
                "price": design.price,
                "compare_at_price": None,
                "tier": None,
            }

        raise InvalidSlotError(f"Unknown service '{service_slug}' with variation '{variation_id}'.")

    @staticmethod
    def _format_address(address) -> str:
        if address is None:
            return ""
        return ", ".join(
            part
            for part in [
                address.address_line1,
                address.locality,
                " ".join(filter(None, [address.administrative_district_level1, address.postal_code])),
            ]
            if part
        )
