import datetime as dt
import logging
import uuid

from app.domain.pmu_catalog import (
    PMU_CONSULTATIONS,
    PMU_DEPOSIT,
    PMU_TECHNIQUES,
    PmuConsultationDefinition,
    PmuTechniqueDefinition,
    find_consultation,
    find_technique,
)
from app.domain.schemas import (
    PmuAvailabilityResponse,
    PmuCatalogResponse,
    PmuConsultationConfirmation,
    PmuConsultationOffer,
    PmuConsultationRequest,
    PmuDepositBookingConfirmation,
    PmuDepositBookingRequest,
    PmuSlotOption,
    PmuTechniqueOffer,
)
from app.integrations.square.availability import SquareAvailabilityGateway
from app.integrations.square.bookings import BookingSegment, SquareBookingGateway
from app.integrations.square.business import SquareBusinessRepository
from app.integrations.square.catalog import SquareCatalogRepository
from app.integrations.square.credentials import get_square_credentials
from app.integrations.square.customer_attributes import SquareCustomerAttributesGateway
from app.integrations.square.customers import SquareCustomerGateway
from app.integrations.square.exceptions import SquareIntegrationError
from app.integrations.square.payments import SquarePaymentGateway
from app.integrations.sms.notifier import notify_consultation_request_sms
from app.services.formatting import format_square_address
from app.integrations.square.team import SquareTeamRepository

logger = logging.getLogger(__name__)


class PmuServiceNotFoundError(Exception):
    pass


class InvalidProviderError(Exception):
    """The requested team_member_id isn't one of the providers this consultation type offers."""


def _search_window(days: int) -> tuple[str, str]:
    now = dt.datetime.now(dt.timezone.utc)
    start_at = now.isoformat().replace("+00:00", "Z")
    end_at = (now + dt.timedelta(days=days)).isoformat().replace("+00:00", "Z")
    return start_at, end_at


class PmuCatalogService:
    """Live prices/durations for the AK PMU landing page — same "structural mapping only,
    everything else read live from Square" convention as CatalogService (nails)."""

    def __init__(self, catalog_repo: SquareCatalogRepository, business_id: int):
        self._catalog_repo = catalog_repo
        self._business_id = business_id

    def get_catalog(self) -> PmuCatalogResponse:
        # Not filtered by `public` here — the booking modal fetches this same catalog to resolve a
        # technique's name/price by slug even for a non-public one (opened via PmuDeepLinkOpener),
        # so the public/private split has to happen client-side (see PmuTechniques.tsx) instead.
        techniques = [self._build_technique(t) for t in PMU_TECHNIQUES]
        consultations = [self._build_consultation(c) for c in PMU_CONSULTATIONS]
        deposit_variation = self._find_variation(PMU_DEPOSIT.item_id, PMU_DEPOSIT.variation_id)
        deposit_amount = (deposit_variation.item_variation_data.price_money.amount or 0) / 100
        creds = get_square_credentials(self._business_id)
        return PmuCatalogResponse(
            techniques=techniques,
            consultations=consultations,
            deposit_amount=deposit_amount,
            square_application_id=creds.application_id,
            square_location_id=creds.location_id,
        )

    def _build_technique(self, definition: PmuTechniqueDefinition) -> PmuTechniqueOffer:
        variation = self._find_variation(definition.item_id, definition.variation_id)
        vd = variation.item_variation_data
        return PmuTechniqueOffer(
            slug=definition.slug,
            name=definition.name,
            description=definition.description,
            price=(vd.price_money.amount or 0) / 100,
            duration_minutes=(vd.service_duration or 0) // 60_000,
            variation_id=variation.id,
            variation_version=variation.version,
            public=definition.public,
        )

    def _build_consultation(self, definition: PmuConsultationDefinition) -> PmuConsultationOffer:
        variation = self._find_variation(definition.item_id, definition.variation_id)
        vd = variation.item_variation_data
        return PmuConsultationOffer(
            slug=definition.slug,
            name=definition.name,
            description=definition.description,
            price=(vd.price_money.amount or 0) / 100,
            duration_minutes=(vd.service_duration or 0) // 60_000,
            variation_id=variation.id,
            variation_version=variation.version,
            team_member_ids=definition.team_member_ids,
        )

    def _find_variation(self, item_id: str, variation_id: str):
        item = self._catalog_repo.get_item(item_id)
        variation = next((v for v in item.item_data.variations or [] if v.id == variation_id), None)
        if variation is None:
            raise PmuServiceNotFoundError(f"Variation '{variation_id}' not found on item '{item_id}'")
        return variation


class PmuAvailabilityService:
    """Single-segment, single-provider availability search — same simpler shape as
    AvailabilityService's own four-hand-request path (no tier/price comparison, which is a
    manicure/pedicure-specific concept that doesn't apply here)."""

    def __init__(self, availability_gateway: SquareAvailabilityGateway, team_repo: SquareTeamRepository):
        self._availability_gateway = availability_gateway
        self._team_repo = team_repo

    def search_technique(self, technique_slug: str, days: int) -> PmuAvailabilityResponse:
        definition = find_technique(technique_slug)
        if definition is None:
            raise PmuServiceNotFoundError(f"Unknown technique '{technique_slug}'")
        return self._search([definition.variation_id], definition.team_member_ids, days)

    def search_consultation(self, consultation_slug: str, days: int) -> PmuAvailabilityResponse:
        definition = find_consultation(consultation_slug)
        if definition is None:
            raise PmuServiceNotFoundError(f"Unknown consultation '{consultation_slug}'")
        return self._search([definition.variation_id], definition.team_member_ids, days)

    def _search(self, variation_ids: list[str], team_member_ids: list[str], days: int) -> PmuAvailabilityResponse:
        start_at, end_at = _search_window(days)
        availabilities = self._availability_gateway.search(
            service_variation_ids=variation_ids, start_at=start_at, end_at=end_at, team_member_ids=team_member_ids
        )
        slots: list[PmuSlotOption] = []
        for availability in availabilities:
            segment = availability.appointment_segments[0]
            team_member_id = segment.team_member_id
            duration_minutes = (segment.duration_minutes or 0)
            start = dt.datetime.fromisoformat(availability.start_at.replace("Z", "+00:00"))
            end = start + dt.timedelta(minutes=duration_minutes)
            slots.append(
                PmuSlotOption(
                    start_at=availability.start_at,
                    end_at=end.isoformat().replace("+00:00", "Z"),
                    team_member_id=team_member_id,
                    artist_name=self._artist_display_name(team_member_id),
                )
            )
        slots.sort(key=lambda s: s.start_at)
        return PmuAvailabilityResponse(slots=slots)

    def _artist_display_name(self, team_member_id: str) -> str | None:
        member = self._team_repo.get_team_member(team_member_id)
        if member is None:
            return None
        family_initial = f" {member.family_name[0]}." if member.family_name else ""
        return f"{member.given_name or 'Artist'}{family_initial}"


class PmuBookingService:
    """Consultations book exactly like any other appointment (see BookingService.create_booking —
    no payment collected). The deposit-first flow is genuinely different: reserve the real
    appointment slot first, then charge a real $100 card payment to confirm it — if the charge
    fails, the reservation is rolled back (see SquareBookingGateway.cancel_booking) so a declined
    card never leaves a phantom hold on the calendar.
    """

    def __init__(
        self,
        customer_gateway: SquareCustomerGateway,
        booking_gateway: SquareBookingGateway,
        payment_gateway: SquarePaymentGateway,
        catalog_repo: SquareCatalogRepository,
        team_repo: SquareTeamRepository,
        customer_attributes_gateway: SquareCustomerAttributesGateway,
        business_id: int,
        business_repo: SquareBusinessRepository,
    ):
        self._customer_gateway = customer_gateway
        self._booking_gateway = booking_gateway
        self._payment_gateway = payment_gateway
        self._catalog_repo = catalog_repo
        self._business_id = business_id
        self._business_repo = business_repo
        self._team_repo = team_repo
        self._customer_attributes_gateway = customer_attributes_gateway

    def book_consultation(self, request: PmuConsultationRequest) -> PmuConsultationConfirmation:
        definition = find_consultation(request.consultation_slug)
        if definition is None:
            raise PmuServiceNotFoundError(f"Unknown consultation '{request.consultation_slug}'")
        if request.team_member_id not in definition.team_member_ids:
            raise InvalidProviderError(f"'{request.team_member_id}' doesn't offer this consultation")

        variation = self._find_variation(definition.item_id, definition.variation_id)
        vd = variation.item_variation_data
        duration_minutes = (vd.service_duration or 0) // 60_000

        customer_id = self._customer_gateway.find_or_create(
            given_name=request.customer.given_name,
            family_name=request.customer.family_name,
            email_address=request.customer.email_address,
            phone_number=request.customer.phone_number,
        )
        self._attach_customer_attributes(customer_id, request)

        booking = self._booking_gateway.create_booking(
            idempotency_key=str(uuid.uuid4()),
            customer_id=customer_id,
            start_at=request.start_at,
            team_member_id=request.team_member_id,
            segments=[
                BookingSegment(
                    service_variation_id=variation.id,
                    service_variation_version=variation.version,
                    duration_minutes=duration_minutes,
                )
            ],
            customer_note=request.note,
        )

        # Business 2 automation #1 — Square's own confirmation text doesn't reliably fire for this
        # booking type. Same fail-open shape/placement as notify_four_hand_request_sms's own call
        # in create_four_hand_request: inline in this synchronous service method (already run via
        # run_in_threadpool from the async route), not the route itself, so the blocking relay call
        # never runs on the event loop. Never blocks the booking response either way. Address is
        # only actually resolved (a live Square location lookup) for an in-person consultation —
        # not needed, and not fetched, for an online one.
        location_address = "" if definition.is_online else format_square_address(self._business_repo.get_location().address)
        notify_consultation_request_sms(
            given_name=request.customer.given_name,
            phone_number=request.customer.phone_number,
            business_id=self._business_id,
            start_at=booking.start_at,
            is_online=definition.is_online,
            location_address=location_address,
        )

        return PmuConsultationConfirmation(
            booking_id=booking.id,
            status=booking.status,
            start_at=booking.start_at,
            service_name=definition.name,
            artist_name=self._artist_display_name(request.team_member_id),
            square_customer_id=customer_id,
        )

    def book_with_deposit(self, request: PmuDepositBookingRequest) -> PmuDepositBookingConfirmation:
        definition = find_technique(request.technique_slug)
        if definition is None:
            raise PmuServiceNotFoundError(f"Unknown technique '{request.technique_slug}'")
        if request.team_member_id not in definition.team_member_ids:
            raise InvalidProviderError(f"'{request.team_member_id}' doesn't offer this technique")

        variation = self._find_variation(definition.item_id, definition.variation_id)
        vd = variation.item_variation_data
        full_price = (vd.price_money.amount or 0) / 100
        duration_minutes = (vd.service_duration or 0) // 60_000

        customer_id = self._customer_gateway.find_or_create(
            given_name=request.customer.given_name,
            family_name=request.customer.family_name,
            email_address=request.customer.email_address,
            phone_number=request.customer.phone_number,
        )
        self._attach_customer_attributes(customer_id, request)

        # Reserve the slot FIRST — a declined card should never look like a successful booking,
        # but a successful charge for a slot that turned out to be unavailable would be worse
        # (real money taken for nothing this app can't self-correct). This order means the only
        # failure mode needing cleanup is "booked, then charge failed" — handled below — never
        # "charged, then booking failed".
        booking = self._booking_gateway.create_booking(
            idempotency_key=str(uuid.uuid4()),
            customer_id=customer_id,
            start_at=request.start_at,
            team_member_id=request.team_member_id,
            segments=[
                BookingSegment(
                    service_variation_id=variation.id,
                    service_variation_version=variation.version,
                    duration_minutes=duration_minutes,
                )
            ],
            customer_note=request.note,
        )

        try:
            payment = self._payment_gateway.charge(
                idempotency_key=str(uuid.uuid4()),
                source_id=request.source_id,
                amount_cents=PMU_DEPOSIT.amount_cents,
                customer_id=customer_id,
                note=f"Deposit for {definition.name} (booking {booking.id})",
            )
        except SquareIntegrationError:
            self._booking_gateway.cancel_booking(booking.id)
            raise

        deposit_amount = PMU_DEPOSIT.amount_cents / 100
        return PmuDepositBookingConfirmation(
            booking_id=booking.id,
            status=booking.status,
            start_at=booking.start_at,
            duration_minutes=duration_minutes,
            service_name=definition.name,
            full_price=full_price,
            deposit_amount=deposit_amount,
            remaining_balance=full_price - deposit_amount,
            artist_name=self._artist_display_name(request.team_member_id),
            payment_id=payment.id,
            square_customer_id=customer_id,
        )

    def _attach_customer_attributes(self, customer_id: str, request) -> None:
        self._customer_attributes_gateway.attach_tracking(customer_id, request.tracking)
        if request.customer.email_address is not None:
            self._customer_attributes_gateway.attach_email_consent(customer_id)
        self._customer_attributes_gateway.attach_sms_consent(customer_id, request.customer.marketing_opt_in)

    def _find_variation(self, item_id: str, variation_id: str):
        item = self._catalog_repo.get_item(item_id)
        variation = next((v for v in item.item_data.variations or [] if v.id == variation_id), None)
        if variation is None:
            raise PmuServiceNotFoundError(f"Variation '{variation_id}' not found on item '{item_id}'")
        return variation

    def _artist_display_name(self, team_member_id: str) -> str | None:
        member = self._team_repo.get_team_member(team_member_id)
        if member is None:
            return None
        family_initial = f" {member.family_name[0]}." if member.family_name else ""
        return f"{member.given_name or 'Artist'}{family_initial}"
