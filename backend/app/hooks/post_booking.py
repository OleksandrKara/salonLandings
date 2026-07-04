"""Extensibility point for everything that should happen after a booking is
confirmed, without touching booking_service itself.

Each hook must never raise — a failure here must not fail the booking, since
the appointment is already confirmed in Square by the time hooks run. Add new
hooks (Mailchimp signup, CRM sync, SMS confirmation, analytics event) as
functions appended to POST_BOOKING_HOOKS.
"""

import logging

from app.domain.schemas import BookingConfirmation, CustomerContact

logger = logging.getLogger(__name__)

PostBookingHook = "Callable[[BookingConfirmation, CustomerContact], None]"


def log_booking_hook(confirmation: BookingConfirmation, customer: CustomerContact) -> None:
    logger.info(
        "Booking confirmed: id=%s service=%s tier=%s start_at=%s customer=%s",
        confirmation.booking_id,
        confirmation.service_name,
        confirmation.tier,
        confirmation.start_at,
        customer.email_address,
    )


# Future: mailchimp_signup_hook, crm_sync_hook, sms_confirmation_hook, analytics_hook
POST_BOOKING_HOOKS = [log_booking_hook]


def run_post_booking_hooks(confirmation: BookingConfirmation, customer: CustomerContact) -> None:
    for hook in POST_BOOKING_HOOKS:
        try:
            hook(confirmation, customer)
        except Exception:
            logger.exception("Post-booking hook %s failed", getattr(hook, "__name__", hook))
