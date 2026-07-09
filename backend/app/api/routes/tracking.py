import logging

from fastapi import APIRouter, Depends, Request, Response

from app.api.deps import get_tracking_service
from app.domain.schemas import (
    BookingFunnelStepEvent,
    EventRecordedResponse,
    TrackingEvent,
    TrackingSnapshot,
    VisitRecordedResponse,
)
from app.services.identity import (
    resolve_booking_funnel_step_event,
    resolve_tracking_event,
    resolve_tracking_snapshot,
)
from app.services.request_context import derive_client_context
from app.services.tracking_service import TrackingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tracking", tags=["tracking"])


@router.post("/visit", response_model=VisitRecordedResponse, status_code=201)
async def record_visit(
    snapshot: TrackingSnapshot,
    request: Request,
    response: Response,
    tracking_service: TrackingService = Depends(get_tracking_service),
) -> VisitRecordedResponse:
    snapshot = resolve_tracking_snapshot(request, response, snapshot)
    client_context = derive_client_context(request)
    try:
        await tracking_service.record_visit(snapshot, client_context)
    except Exception:
        # Analytics must never block or break the visitor's page load.
        logger.exception("Failed to record visit")
    return VisitRecordedResponse(visitor_id=snapshot.visitor_id)


@router.post("/event", response_model=EventRecordedResponse, status_code=201)
async def record_event(
    event: TrackingEvent,
    request: Request,
    response: Response,
    tracking_service: TrackingService = Depends(get_tracking_service),
) -> EventRecordedResponse:
    event = resolve_tracking_event(request, response, event)
    await tracking_service.record_event_safely(event)
    return EventRecordedResponse(recorded=True)


@router.post("/funnel-event", response_model=EventRecordedResponse, status_code=201)
async def record_booking_funnel_step(
    event: BookingFunnelStepEvent,
    request: Request,
    response: Response,
    tracking_service: TrackingService = Depends(get_tracking_service),
) -> EventRecordedResponse:
    event = resolve_booking_funnel_step_event(request, response, event)
    await tracking_service.record_booking_funnel_step_safely(event)
    return EventRecordedResponse(recorded=True)
