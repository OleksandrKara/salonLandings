import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_booking_service, get_tracking_service
from app.domain.schemas import (
    BookingConfirmation,
    BookingRequest,
    FourHandRequestConfirmation,
    FourHandRequestSubmission,
)
from app.integrations.square.exceptions import SlotNoLongerAvailableError, SquareIntegrationError
from app.services.artist_service import ArtistNotFoundError
from app.services.booking_service import BookingService, InvalidSlotError
from app.services.catalog_service import ServiceNotFoundError
from app.services.request_context import derive_client_context
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("", response_model=BookingConfirmation, status_code=201)
async def create_booking(
    request: BookingRequest,
    http_request: Request,
    booking_service: BookingService = Depends(get_booking_service),
    tracking_service: TrackingService = Depends(get_tracking_service),
) -> BookingConfirmation:
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
        client_context=derive_client_context(http_request),
        square_booking_id=confirmation.booking_id,
        service_name=confirmation.service_name,
        price=confirmation.price,
        customer_email=request.customer.email_address,
        customer_phone=request.customer.phone_number,
    )
    return confirmation


@router.post("/four-hand-request", response_model=FourHandRequestConfirmation, status_code=201)
async def submit_four_hand_request(
    submission: FourHandRequestSubmission,
    http_request: Request,
    booking_service: BookingService = Depends(get_booking_service),
    tracking_service: TrackingService = Depends(get_tracking_service),
) -> FourHandRequestConfirmation:
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
        client_context=derive_client_context(http_request),
        square_booking_id=confirmation.booking_id,
        service_name=confirmation.service_name,
        price=None,
        customer_email=submission.customer.email_address,
        customer_phone=submission.customer.phone_number,
    )
    return confirmation
