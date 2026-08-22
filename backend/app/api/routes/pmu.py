import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool

from app.api.deps import (
    get_abuse_guard,
    get_pmu_availability_service,
    get_pmu_booking_service,
    get_pmu_catalog_service,
    get_tracking_service,
)
from app.core.business_context import BusinessContext, get_current_business
from app.core.config import get_settings
from app.domain.schemas import (
    PmuAvailabilityResponse,
    PmuCatalogResponse,
    PmuConsultationConfirmation,
    PmuConsultationRequest,
    PmuDepositBookingConfirmation,
    PmuDepositBookingRequest,
)
from app.integrations.square.customers import normalize_phone_for_storage
from app.integrations.square.exceptions import SquareIntegrationError
from app.integrations.square.payments import PaymentDeclinedError
from app.services.abuse_guard import AbuseGuard, AbuseGuardError
from app.services.identity import resolve_tracking_snapshot
from app.services.pmu_service import (
    InvalidProviderError,
    PmuAvailabilityService,
    PmuBookingService,
    PmuCatalogService,
    PmuServiceNotFoundError,
)
from app.services.rebooking_promo import enroll_rebooking_promo_safely
from app.services.request_context import derive_client_context
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pmu", tags=["pmu"])

# Same generic message as mani's own abuse-guard rejections — see bookings.py.
ABUSE_BLOCKED_MESSAGE = "We couldn't verify your submission. Please try again."


@router.get("/catalog", response_model=PmuCatalogResponse)
def get_catalog(catalog_service: PmuCatalogService = Depends(get_pmu_catalog_service)) -> PmuCatalogResponse:
    try:
        return catalog_service.get_catalog()
    except SquareIntegrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/availability/technique/{technique_slug}", response_model=PmuAvailabilityResponse)
def get_technique_availability(
    technique_slug: str,
    days: int | None = None,
    availability_service: PmuAvailabilityService = Depends(get_pmu_availability_service),
) -> PmuAvailabilityResponse:
    try:
        return availability_service.search_technique(technique_slug, days or get_settings().availability_search_days)
    except PmuServiceNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SquareIntegrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/availability/consultation/{consultation_slug}", response_model=PmuAvailabilityResponse)
def get_consultation_availability(
    consultation_slug: str,
    days: int | None = None,
    availability_service: PmuAvailabilityService = Depends(get_pmu_availability_service),
) -> PmuAvailabilityResponse:
    try:
        return availability_service.search_consultation(consultation_slug, days or get_settings().availability_search_days)
    except PmuServiceNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SquareIntegrationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/bookings/consultation", response_model=PmuConsultationConfirmation, status_code=201)
async def book_consultation(
    request: PmuConsultationRequest,
    http_request: Request,
    http_response: Response,
    booking_service: PmuBookingService = Depends(get_pmu_booking_service),
    tracking_service: TrackingService = Depends(get_tracking_service),
    abuse_guard: AbuseGuard = Depends(get_abuse_guard),
    business: BusinessContext = Depends(get_current_business),
) -> PmuConsultationConfirmation:
    tracking = resolve_tracking_snapshot(http_request, http_response, request.tracking)
    client_context = derive_client_context(http_request)
    phone_number = normalize_phone_for_storage(request.customer.phone_number)
    try:
        await abuse_guard.check(
            business_id=business.id,
            endpoint="pmu_consultation",
            phone_number=phone_number,
            ip_address=client_context["ip_address"],
            honeypot_value=request.website,
            form_rendered_at=request.form_rendered_at,
            turnstile_token=request.turnstile_token,
        )
    except AbuseGuardError as exc:
        raise HTTPException(status_code=400, detail=ABUSE_BLOCKED_MESSAGE) from exc

    try:
        confirmation = await run_in_threadpool(booking_service.book_consultation, request)
    except PmuServiceNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InvalidProviderError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SquareIntegrationError as exc:
        logger.error("PMU consultation booking failed: %s", exc.detail)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    await tracking_service.record_submission_safely(
        business_id=business.id,
        submission_type="booking",
        tracking=tracking,
        client_context=client_context,
        square_booking_id=confirmation.booking_id,
        service_name=confirmation.service_name,
        price=0,
        customer_email=request.customer.email_address,
        customer_phone=phone_number,
    )
    # These three calls, plus link_contact_to_booking_safely below, were already the
    # established pattern in bookings.py (mani's own booking routes) — missing here until now,
    # which meant every PMU booking silently skipped marketing.attribution (so it never counted
    # toward the "tracked-flow" conversion path despite PMU running a real, active landing-page
    # experiment — see marketing.experiments — and instead only ever showed up via the
    # follow-up-appointments fallback, which is meant for a manager's own later outreach, not an
    # immediate self-service booking) and both consent-log tables (marketing.sms_consent/
    # email_consent — link_contact_to_booking_safely below only sets the boolean flag on the
    # contact row itself, not the append-only audit log). Found live 2026-08-22.
    await tracking_service.record_attribution_safely(
        business_id=business.id,
        tracking=tracking,
        booking_id=confirmation.booking_id,
    )
    await tracking_service.record_sms_consent_safely(
        business_id=business.id,
        phone_number=phone_number,
        consented=request.customer.marketing_opt_in,
        source="booking",
        visitor_id=tracking.visitor_id if tracking else None,
        ip_address=client_context["ip_address"],
    )
    if request.customer.email_address is not None:
        await tracking_service.record_email_consent_safely(
            business_id=business.id,
            email_address=request.customer.email_address,
            source="booking",
            visitor_id=tracking.visitor_id if tracking else None,
            ip_address=client_context["ip_address"],
        )
    await tracking_service.link_contact_to_booking_safely(
        business_id=business.id,
        given_name=request.customer.given_name,
        phone_number=phone_number,
        email_address=request.customer.email_address,
        tracking=tracking,
        client_context=client_context,
        sms_consent=request.customer.marketing_opt_in,
        email_consent=request.customer.email_address is not None,
        square_customer_id=confirmation.square_customer_id,
        square_booking_id=confirmation.booking_id,
        booking_status=confirmation.status,
        booking_start_at=confirmation.start_at,
        booking_service_name=confirmation.service_name,
        booking_price=0,
        booking_artist_name=confirmation.artist_name,
    )
    return confirmation


@router.post("/bookings/deposit", response_model=PmuDepositBookingConfirmation, status_code=201)
async def book_with_deposit(
    request: PmuDepositBookingRequest,
    http_request: Request,
    http_response: Response,
    booking_service: PmuBookingService = Depends(get_pmu_booking_service),
    tracking_service: TrackingService = Depends(get_tracking_service),
    abuse_guard: AbuseGuard = Depends(get_abuse_guard),
    business: BusinessContext = Depends(get_current_business),
) -> PmuDepositBookingConfirmation:
    tracking = resolve_tracking_snapshot(http_request, http_response, request.tracking)
    client_context = derive_client_context(http_request)
    phone_number = normalize_phone_for_storage(request.customer.phone_number)
    try:
        await abuse_guard.check(
            business_id=business.id,
            endpoint="pmu_deposit",
            phone_number=phone_number,
            ip_address=client_context["ip_address"],
            honeypot_value=request.website,
            form_rendered_at=request.form_rendered_at,
            turnstile_token=request.turnstile_token,
        )
    except AbuseGuardError as exc:
        raise HTTPException(status_code=400, detail=ABUSE_BLOCKED_MESSAGE) from exc

    try:
        confirmation = await run_in_threadpool(booking_service.book_with_deposit, request)
    except PmuServiceNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PaymentDeclinedError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except SquareIntegrationError as exc:
        logger.error("PMU deposit booking failed: %s", exc.detail)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    if request.promo is not None:
        # Best-effort, doesn't block the booking response either way, and never trusted on its
        # own — salaryReview-dev independently re-verifies the signature before enrolling
        # anything, see enroll_rebooking_promo_safely's own doc. Only the deposit flow (a real
        # paid booking) enrolls — a free consultation isn't the kind of commercial transaction
        # this discount is meant to reward a rebooking off of.
        await run_in_threadpool(
            enroll_rebooking_promo_safely,
            square_customer_id=confirmation.square_customer_id,
            exp_epoch_seconds=request.promo.exp_epoch_seconds,
            signature=request.promo.signature,
            promo_code=request.promo.code,
            business_id=business.id,
            customer_name=f"{request.customer.given_name} {request.customer.family_name or ''}".strip(),
            phone_number=phone_number,
            appointment_start_at=confirmation.start_at,
        )

    await tracking_service.record_submission_safely(
        business_id=business.id,
        submission_type="booking",
        tracking=tracking,
        client_context=client_context,
        square_booking_id=confirmation.booking_id,
        service_name=confirmation.service_name,
        price=confirmation.full_price,
        customer_email=request.customer.email_address,
        customer_phone=phone_number,
    )
    await tracking_service.record_attribution_safely(
        business_id=business.id,
        tracking=tracking,
        booking_id=confirmation.booking_id,
    )
    await tracking_service.record_sms_consent_safely(
        business_id=business.id,
        phone_number=phone_number,
        consented=request.customer.marketing_opt_in,
        source="booking",
        visitor_id=tracking.visitor_id if tracking else None,
        ip_address=client_context["ip_address"],
    )
    if request.customer.email_address is not None:
        await tracking_service.record_email_consent_safely(
            business_id=business.id,
            email_address=request.customer.email_address,
            source="booking",
            visitor_id=tracking.visitor_id if tracking else None,
            ip_address=client_context["ip_address"],
        )
    await tracking_service.link_contact_to_booking_safely(
        business_id=business.id,
        given_name=request.customer.given_name,
        phone_number=phone_number,
        email_address=request.customer.email_address,
        tracking=tracking,
        client_context=client_context,
        sms_consent=request.customer.marketing_opt_in,
        email_consent=request.customer.email_address is not None,
        square_customer_id=confirmation.square_customer_id,
        square_booking_id=confirmation.booking_id,
        booking_status=confirmation.status,
        booking_start_at=confirmation.start_at,
        booking_service_name=confirmation.service_name,
        booking_price=confirmation.full_price,
        booking_artist_name=confirmation.artist_name,
    )
    return confirmation
