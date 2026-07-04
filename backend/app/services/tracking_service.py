import logging

from app.domain.schemas import TrackingSnapshot
from app.integrations.marketing_db.repository import MarketingRepository

logger = logging.getLogger(__name__)


class TrackingService:
    def __init__(self, repository: MarketingRepository):
        self._repository = repository

    async def record_visit(self, snapshot: TrackingSnapshot, client_context: dict) -> None:
        fields = {**snapshot.model_dump(exclude={"visitor_id"}), **client_context}
        await self._repository.insert_visit(visitor_id=snapshot.visitor_id, fields=fields)

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
