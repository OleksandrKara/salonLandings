import logging

from app.domain.consent import (
    EMAIL_CONSENT_TEXT,
    EMAIL_CONSENT_VERSION,
    SMS_CONSENT_TEXT,
    SMS_CONSENT_VERSION,
)
from app.domain.schemas import TrackingEvent, TrackingSnapshot
from app.integrations.marketing_db.repository import MarketingRepository
from app.services.traffic_source import classify_traffic_source

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

    async def record_sms_consent(
        self,
        *,
        phone_number: str,
        consented: bool,
        source: str,
        visitor_id: str | None,
        ip_address: str | None,
    ) -> None:
        """Square has no API for SMS marketing consent, so this DB is the sole source of
        truth — logged as an append-only event (not an upsert) so a later opt-out doesn't
        erase the record that consent was given in the first place.
        """
        await self._repository.insert_sms_consent(
            phone_number=phone_number,
            consented=consented,
            consent_text=SMS_CONSENT_TEXT,
            consent_version=SMS_CONSENT_VERSION,
            source=source,
            visitor_id=visitor_id,
            ip_address=ip_address,
        )

    async def record_sms_consent_safely(self, **kwargs) -> None:
        """SMS consent logging must never break a real booking — same guarantee as
        record_submission_safely.
        """
        try:
            await self.record_sms_consent(**kwargs)
        except Exception:
            logger.exception("Failed to record SMS consent (booking itself was unaffected)")

    async def record_email_consent(
        self,
        *,
        email_address: str,
        source: str,
        visitor_id: str | None,
        ip_address: str | None,
    ) -> None:
        """Always consented=True — email marketing consent is granted automatically on
        every booking, independent of the customer's SMS choice (no separate email opt-in
        checkbox exists). See EMAIL_CONSENT_TEXT for why this is legally distinct from SMS.
        """
        await self._repository.insert_email_consent(
            email_address=email_address,
            consented=True,
            consent_text=EMAIL_CONSENT_TEXT,
            consent_version=EMAIL_CONSENT_VERSION,
            source=source,
            visitor_id=visitor_id,
            ip_address=ip_address,
        )

    async def record_email_consent_safely(self, **kwargs) -> None:
        """Email consent logging must never break a real booking — same guarantee as
        record_submission_safely.
        """
        try:
            await self.record_email_consent(**kwargs)
        except Exception:
            logger.exception("Failed to record email consent (booking itself was unaffected)")

    async def record_step1_contact(
        self,
        *,
        given_name: str,
        phone_number: str,
        email_address: str | None,
        tracking: TrackingSnapshot | None,
        client_context: dict,
    ) -> None:
        """Captures a lead as soon as Step 1 (name + phone) is submitted — before a real Square
        booking (and thus a Square customer) exists. No Square call happens here; that only
        happens later, automatically, if/when this contact completes a real booking.
        """
        landing_page_slug, variant_name = await self._repository.resolve_landing_context(
            landing_page_id=tracking.landing_page_id if tracking else None,
            variant_id=tracking.variant_id if tracking else None,
        )
        await self._repository.upsert_contact_step1(
            phone_number=phone_number,
            given_name=given_name,
            email_address=email_address,
            traffic_source=classify_traffic_source(tracking),
            utm_source=tracking.utm_source if tracking else None,
            utm_medium=tracking.utm_medium if tracking else None,
            utm_campaign=tracking.utm_campaign if tracking else None,
            referrer=tracking.referrer if tracking else None,
            landing_page_slug=landing_page_slug,
            variant_name=variant_name,
            device_type=client_context.get("device_type"),
            os_name=client_context.get("os_name"),
            os_version=client_context.get("os_version"),
            browser_name=client_context.get("browser_name"),
            browser_version=client_context.get("browser_version"),
        )

    async def record_step1_contact_safely(self, **kwargs) -> None:
        """Contact capture is a lead-tracking convenience — must never block Step 1."""
        try:
            await self.record_step1_contact(**kwargs)
        except Exception:
            logger.exception("Failed to record Step 1 contact")

    async def link_contact_to_booking(
        self,
        *,
        given_name: str,
        phone_number: str,
        email_address: str | None,
        tracking: TrackingSnapshot | None,
        client_context: dict,
        sms_consent: bool,
        email_consent: bool,
        square_customer_id: str,
        square_booking_id: str,
        booking_status: str,
        booking_start_at: str | None,
        booking_service_name: str,
        booking_price: float | None,
        booking_artist_name: str | None,
    ) -> None:
        """Links the contact captured at Step 1 to the real Square booking/customer that
        eventually resulted from it — the local "did this lead actually book?" view Square
        itself has no equivalent of. Falls back to creating the contact now if Step 1's
        capture never landed (e.g. a dropped request) rather than silently losing the booking.
        """
        landing_page_slug, variant_name = await self._repository.resolve_landing_context(
            landing_page_id=tracking.landing_page_id if tracking else None,
            variant_id=tracking.variant_id if tracking else None,
        )
        await self._repository.update_contact_after_booking(
            phone_number=phone_number,
            given_name=given_name,
            email_address=email_address,
            traffic_source=classify_traffic_source(tracking),
            utm_source=tracking.utm_source if tracking else None,
            utm_medium=tracking.utm_medium if tracking else None,
            utm_campaign=tracking.utm_campaign if tracking else None,
            referrer=tracking.referrer if tracking else None,
            landing_page_slug=landing_page_slug,
            variant_name=variant_name,
            device_type=client_context.get("device_type"),
            os_name=client_context.get("os_name"),
            os_version=client_context.get("os_version"),
            browser_name=client_context.get("browser_name"),
            browser_version=client_context.get("browser_version"),
            sms_consent=sms_consent,
            email_consent=email_consent,
            square_customer_id=square_customer_id,
            square_booking_id=square_booking_id,
            booking_status=booking_status,
            booking_start_at=booking_start_at,
            booking_service_name=booking_service_name,
            booking_price=booking_price,
            booking_artist_name=booking_artist_name,
        )

    async def link_contact_to_booking_safely(self, **kwargs) -> None:
        """Must never break a real booking — same guarantee as record_submission_safely."""
        try:
            await self.link_contact_to_booking(**kwargs)
        except Exception:
            logger.exception("Failed to link contact to booking (booking itself was unaffected)")
