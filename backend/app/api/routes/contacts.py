import logging

from fastapi import APIRouter, Depends, Request
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_customer_gateway, get_tracking_service
from app.domain.schemas import ContactCaptureRequest, ContactCaptureResponse
from app.integrations.square.customers import SquareCustomerGateway
from app.services.request_context import derive_client_context
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.post("", response_model=ContactCaptureResponse, status_code=201)
async def capture_contact(
    request: ContactCaptureRequest,
    http_request: Request,
    tracking_service: TrackingService = Depends(get_tracking_service),
    customer_gateway: SquareCustomerGateway = Depends(get_customer_gateway),
) -> ContactCaptureResponse:
    # Read-only lookup — never creates a Square customer here. A failure must never block
    # Step 1, so it's wrapped independently of record_step1_contact_safely's own guarantee.
    try:
        square_customer_id = await run_in_threadpool(
            customer_gateway.find_existing,
            phone_number=request.phone_number,
            email_address=request.email_address,
        )
    except Exception:
        logger.exception("Square customer lookup failed for Step 1 capture")
        square_customer_id = None

    await tracking_service.record_step1_contact_safely(
        given_name=request.given_name,
        phone_number=request.phone_number,
        email_address=request.email_address,
        tracking=request.tracking,
        client_context=derive_client_context(http_request),
        square_customer_id=square_customer_id,
    )
    return ContactCaptureResponse(recorded=True)
