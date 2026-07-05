import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_abuse_guard, get_booking_service, get_tracking_service
from app.domain.schemas import (
    BookingConfirmation,
    BookingRequest,
    FourHandRequestConfirmation,
    FourHandRequestSubmission,
)
from app.integrations.square.exceptions import SlotNoLongerAvailableError, SquareIntegrationError
from app.services.abuse_guard import AbuseGuard, AbuseGuardError
from app.services.artist_service import ArtistNotFoundError
from app.services.booking_service import BookingService, InvalidSlotError
from app.services.catalog_service import ServiceNotFoundError
from app.services.request_context import derive_client_context
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])

# Deliberately generic — never reveals which specific check failed, so an attacker can't use
# the response to debug their way past the guard.
ABUSE_BLOCKED_MESSAGE = "We couldn't verify your submission. Please try again."


@router.post("", response_model=BookingConfirmation, status_code=201)
async def create_booking(
    request: BookingRequest,
    http_request: Request,
    booking_service: BookingService = Depends(get_booking_service),
    tracking_service: TrackingService = Depends(get_tracking_service),
    abuse_guard: AbuseGuard = Depends(get_abuse_guard),
) -> BookingConfirmation:
    client_context = derive_client_context(http_request)
    try:
        await abuse_guard.check(
            endpoint="booking",
            phone_number=request.customer.phone_number,
            ip_address=client_context["ip_address"],
            honeypot_value=request.website,
            form_rendered_at=request.form_rendered_at,
            turnstile_token=request.turnstile_token,
        )
    except AbuseGuardError as exc:
        raise HTTPException(status_code=400, detail=ABUSE_BLOCKED_MESSAGE) from exc

    try:
        confirmation = await run_in_threadpool(booking_service.create_booking, request)
    except (ServiceNotFoundError, ArtistNotFoundError, InvalidSlotError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SlotNoLongerAvailableError as exc:
        raise HTTPException(status_code=409, detail=exc.message) from exc
    except SquareIntegrationError as exc:
        logger.error("Booking failed: %s", exc.detail)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    await tracking_service.record_submission_safely(
        submission_type="booking",
        tracking=request.tracking,
        client_context=client_context,
        square_booking_id=confirmation.booking_id,
        service_name=confirmation.service_name,
        price=confirmation.price,
        customer_email=request.customer.email_address,
        customer_phone=request.customer.phone_number,
    )
    await tracking_service.record_attribution_safely(
        tracking=request.tracking,
        booking_id=confirmation.booking_id,
    )
    await tracking_service.record_sms_consent_safely(
        phone_number=request.customer.phone_number,
        consented=request.customer.marketing_opt_in,
        source="booking",
        visitor_id=request.tracking.visitor_id if request.tracking else None,
        ip_address=client_context["ip_address"],
    )
    await tracking_service.record_email_consent_safely(
        email_address=request.customer.email_address,
        source="booking",
        visitor_id=request.tracking.visitor_id if request.tracking else None,
        ip_address=client_context["ip_address"],
    )
    await tracking_service.link_contact_to_booking_safely(
        given_name=request.customer.given_name,
        phone_number=request.customer.phone_number,
        email_address=request.customer.email_address,
        tracking=request.tracking,
        client_context=client_context,
        sms_consent=request.customer.marketing_opt_in,
        email_consent=True,
        square_customer_id=confirmation.square_customer_id,
        square_booking_id=confirmation.booking_id,
        booking_status=confirmation.status,
        booking_start_at=confirmation.start_at,
        booking_service_name=confirmation.service_name,
        booking_price=confirmation.price,
        booking_artist_name=confirmation.artist_name,
    )
    return confirmation


@router.post("/four-hand-request", response_model=FourHandRequestConfirmation, status_code=201)
async def submit_four_hand_request(
    submission: FourHandRequestSubmission,
    http_request: Request,
    booking_service: BookingService = Depends(get_booking_service),
    tracking_service: TrackingService = Depends(get_tracking_service),
    abuse_guard: AbuseGuard = Depends(get_abuse_guard),
) -> FourHandRequestConfirmation:
    client_context = derive_client_context(http_request)
    try:
        await abuse_guard.check(
            endpoint="four_hand_request",
            phone_number=submission.customer.phone_number,
            ip_address=client_context["ip_address"],
            honeypot_value=submission.website,
            form_rendered_at=submission.form_rendered_at,
            turnstile_token=submission.turnstile_token,
        )
    except AbuseGuardError as exc:
        raise HTTPException(status_code=400, detail=ABUSE_BLOCKED_MESSAGE) from exc

    try:
        confirmation = await run_in_threadpool(booking_service.submit_four_hand_request, submission)
    except ServiceNotFoundError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except SquareIntegrationError as exc:
        logger.error("4-hand request failed: %s", exc.detail)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    await tracking_service.record_submission_safely(
        submission_type="four_hand_request",
        tracking=submission.tracking,
        client_context=client_context,
        square_booking_id=confirmation.booking_id,
        service_name=confirmation.service_name,
        price=None,
        customer_email=submission.customer.email_address,
        customer_phone=submission.customer.phone_number,
    )
    await tracking_service.record_sms_consent_safely(
        phone_number=submission.customer.phone_number,
        consented=submission.customer.marketing_opt_in,
        source="four_hand_request",
        visitor_id=submission.tracking.visitor_id if submission.tracking else None,
        ip_address=client_context["ip_address"],
    )
    await tracking_service.record_email_consent_safely(
        email_address=submission.customer.email_address,
        source="four_hand_request",
        visitor_id=submission.tracking.visitor_id if submission.tracking else None,
        ip_address=client_context["ip_address"],
    )
    await tracking_service.link_contact_to_booking_safely(
        given_name=submission.customer.given_name,
        phone_number=submission.customer.phone_number,
        email_address=submission.customer.email_address,
        tracking=submission.tracking,
        client_context=client_context,
        sms_consent=submission.customer.marketing_opt_in,
        email_consent=True,
        square_customer_id=confirmation.square_customer_id,
        square_booking_id=confirmation.booking_id,
        booking_status=confirmation.status,
        # The 4-hand path has no self-serve date/time or finalized price yet — the salon calls
        # to schedule those, so there's nothing real to store here until that happens.
        booking_start_at=None,
        booking_service_name=confirmation.service_name,
        booking_price=None,
        booking_artist_name=None,
    )
    return confirmation
