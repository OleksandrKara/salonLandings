import logging

from fastapi import APIRouter, Depends, Request, Response
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_customer_gateway, get_tracking_service
from app.core.business_context import BusinessContext, get_current_business
from app.domain.schemas import ContactCaptureRequest, ContactCaptureResponse
from app.integrations.square.customers import SquareCustomerGateway, normalize_phone_for_storage
from app.services.identity import resolve_tracking_snapshot
from app.services.request_context import derive_client_context
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.post("", response_model=ContactCaptureResponse, status_code=201)
async def capture_contact(
    request: ContactCaptureRequest,
    http_request: Request,
    http_response: Response,
    tracking_service: TrackingService = Depends(get_tracking_service),
    customer_gateway: SquareCustomerGateway = Depends(get_customer_gateway),
    business: BusinessContext = Depends(get_current_business),
) -> ContactCaptureResponse:
    tracking = resolve_tracking_snapshot(http_request, http_response, request.tracking)
    # Normalized once, up front, and reused for every downstream call (Square lookup, the
    # marketing.contacts/submissions write) — marketing.contacts is unique on phone_number and
    # used as the upsert dedup key, so the same physical number typed differently across visits
    # must always normalize to the same string here, or it silently becomes two separate "leads"
    # that never merge. See normalize_phone_for_storage's own doc comment.
    phone_number = normalize_phone_for_storage(request.phone_number)

    # Read-only lookup — never creates a Square customer here. A failure must never block
    # Step 1, so it's wrapped independently of record_step1_contact_safely's own guarantee.
    try:
        square_customer_id = await run_in_threadpool(
            customer_gateway.find_existing,
            phone_number=phone_number,
            email_address=request.email_address,
        )
    except Exception:
        logger.exception("Square customer lookup failed for Step 1 capture")
        square_customer_id = None

    await tracking_service.record_step1_contact_safely(
        business_id=business.id,
        given_name=request.given_name,
        phone_number=phone_number,
        email_address=request.email_address,
        tracking=tracking,
        client_context=derive_client_context(http_request),
        square_customer_id=square_customer_id,
    )
    return ContactCaptureResponse(recorded=True)
