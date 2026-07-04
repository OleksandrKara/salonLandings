import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_booking_service
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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("", response_model=BookingConfirmation, status_code=201)
def create_booking(
    request: BookingRequest, booking_service: BookingService = Depends(get_booking_service)
) -> BookingConfirmation:
    try:
        return booking_service.create_booking(request)
    except (ServiceNotFoundError, ArtistNotFoundError, InvalidSlotError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SlotNoLongerAvailableError as exc:
        raise HTTPException(status_code=409, detail=exc.message) from exc
    except SquareIntegrationError as exc:
        logger.error("Booking failed: %s", exc.detail)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/four-hand-request", response_model=FourHandRequestConfirmation, status_code=201)
def submit_four_hand_request(
    submission: FourHandRequestSubmission, booking_service: BookingService = Depends(get_booking_service)
) -> FourHandRequestConfirmation:
    try:
        return booking_service.submit_four_hand_request(submission)
    except ServiceNotFoundError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except SquareIntegrationError as exc:
        logger.error("4-hand request failed: %s", exc.detail)
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
