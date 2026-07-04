import logging

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_tracking_service
from app.domain.schemas import TrackingSnapshot, VisitRecordedResponse
from app.services.request_context import derive_client_context
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tracking", tags=["tracking"])


@router.post("/visit", response_model=VisitRecordedResponse, status_code=201)
async def record_visit(
    snapshot: TrackingSnapshot,
    request: Request,
    tracking_service: TrackingService = Depends(get_tracking_service),
) -> VisitRecordedResponse:
    client_context = derive_client_context(request)
    try:
        await tracking_service.record_visit(snapshot, client_context)
    except Exception:
        # Analytics must never block or break the visitor's page load.
        logger.exception("Failed to record visit")
    return VisitRecordedResponse(visitor_id=snapshot.visitor_id)
