import logging

from app.domain.schemas import TrackingEvent, TrackingSnapshot
from app.integrations.marketing_db.repository import MarketingRepository

logger = logging.getLogger(__name__)


class TrackingService:
    def __init__(self, repository: MarketingRepository):
        self._repository = repository

    async def record_visit(self, snapshot: TrackingSnapshot, client_context: dict) -> None:
        fields = {**snapshot.model_dump(exclude={"visitor_id"}), **client_context}
        await self._repository.insert_visit(visitor_id=snapshot.visitor_id, fields=fields)

    async def record_event(self, event: TrackingEvent) -> None:
        await self._repository.insert_event(
            session_id=event.session_id,
            landing_page_id=event.landing_page_id,
            variant_id=event.variant_id,
            event_type=event.event_type,
            metadata=event.metadata,
        )

    async def record_event_safely(self, event: TrackingEvent) -> None:
        """Funnel events are analytics only — a failure here must never affect the visitor."""
        try:
            await self.record_event(event)
        except Exception:
            logger.exception("Failed to record tracking event (event_type=%s)", event.event_type)

    async def record_submission(
        self,
        *,
        submission_type: str,
        tracking: TrackingSnapshot | None,
        client_context: dict,
        square_booking_id: str | None,
        service_name: str | None,
        price: float | None,
        customer_email: str | None,
        customer_phone: str | None,
    ) -> None:
        fields: dict = {}
        if tracking is not None:
            fields.update(tracking.model_dump(exclude={"visitor_id"}))
        fields.update(client_context)
        fields["square_booking_id"] = square_booking_id
        fields["service_name"] = service_name
        fields["price"] = price
        fields["customer_email"] = customer_email
        fields["customer_phone"] = customer_phone

        await self._repository.insert_submission(
            visitor_id=tracking.visitor_id if tracking else None,
            submission_type=submission_type,
            fields=fields,
        )

    async def record_submission_safely(self, **kwargs) -> None:
        """Marketing attribution must never break a real booking — log and
        swallow any failure instead of propagating it to the caller.
        """
        try:
            await self.record_submission(**kwargs)
        except Exception:
            logger.exception("Failed to record marketing submission (booking itself was unaffected)")

    async def record_attribution(self, *, tracking: TrackingSnapshot | None, booking_id: str) -> None:
        if tracking is None or tracking.landing_page_id is None or tracking.variant_id is None:
            return  # no active experiment at visit time — nothing to attribute
        await self._repository.insert_attribution(
            booking_id=booking_id,
            landing_page_id=tracking.landing_page_id,
            variant_id=tracking.variant_id,
            source=tracking.utm_source,
        )

    async def record_attribution_safely(self, **kwargs) -> None:
        """Experiment attribution must never break a real booking — same guarantee as
        record_submission_safely, kept as a separate try/except so a bug in one can't
        affect the other.
        """
        try:
            await self.record_attribution(**kwargs)
        except Exception:
            logger.exception("Failed to record attribution (booking itself was unaffected)")
