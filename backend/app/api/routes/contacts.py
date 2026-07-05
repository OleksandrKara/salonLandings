from fastapi import APIRouter, Depends

from app.api.deps import get_tracking_service
from app.domain.schemas import ContactCaptureRequest, ContactCaptureResponse
from app.services.tracking_service import TrackingService

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.post("", response_model=ContactCaptureResponse, status_code=201)
async def capture_contact(
    request: ContactCaptureRequest,
    tracking_service: TrackingService = Depends(get_tracking_service),
) -> ContactCaptureResponse:
    await tracking_service.record_step1_contact_safely(
        given_name=request.given_name,
        phone_number=request.phone_number,
        email_address=request.email_address,
        tracking=request.tracking,
    )
    return ContactCaptureResponse(recorded=True)
