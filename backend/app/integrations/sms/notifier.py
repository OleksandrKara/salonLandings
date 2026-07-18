import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# The salon (San Diego, CA) is Pacific Time — preferred_start_at arrives as UTC ISO 8601 (see
# DateTimeStep, which is Pacific-labeled but submits in UTC), so it's converted here rather than
# read raw. Mirrors TelegramNotificationService.formatPreferredTime's pattern on the salaryReview
# side (that copy is for the Telegram alert text; this one is for the customer-facing SMS body).
_PACIFIC = ZoneInfo("America/Los_Angeles")


def _format_preferred_time(iso_start_at: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_start_at.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(_PACIFIC).strftime("%a, %b %-d at %-I:%M %p %Z")
    except Exception:
        return iso_start_at


def notify_four_hand_request_sms(
    *,
    given_name: str,
    phone_number: str,
    preferred_start_at: str,
) -> bool:
    """Best-effort SMS confirming a new 4-hand lead, relayed through salaryReview (which owns the
    Twilio credentials — this app never holds them). Never raises: a relay outage, missing/invalid
    config, or missing consent must never block lead capture, matching notify_four_hand_request's
    (Telegram) fail-open convention. The "four_hand_request_received" template is TRANSACTIONAL —
    salaryReview's TwilioSmsService sends it regardless of marketing SMS consent.
    """
    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        logger.info("4-hand SMS skipped — internal API not configured")
        return False

    payload = {
        "templateKey": "four_hand_request_received",
        "phoneNumber": phone_number,
        "variables": {
            "name": given_name,
            "preferredTime": _format_preferred_time(preferred_start_at),
        },
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(
                f"{settings.internal_api_base_url}/api/internal/notifications/sms/send",
                json=payload,
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
            response.raise_for_status()
            return bool(response.json().get("sent"))
    except httpx.HTTPError:
        logger.exception("4-hand SMS request failed (lead capture unaffected)")
        return False
