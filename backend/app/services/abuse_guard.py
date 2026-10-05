import datetime as dt
import logging
import re

from app.integrations.marketing_db.repository import MarketingRepository
from app.integrations.turnstile import verify_turnstile

logger = logging.getLogger(__name__)

# A real customer essentially never books for themselves more than this many times in a day.
MAX_BOOKING_ATTEMPTS_PER_PHONE_PER_DAY = 3
# Looser than the per-phone cap since a shared IP (a family, an office) isn't a 1:1 proxy for
# one person — this is aimed at a burst from a single source, not normal shared-network use.
MAX_BOOKING_ATTEMPTS_PER_IP_PER_HOUR = 5
# No human reads the booking form, picks a slot, and hits submit in under this — a real
# submission this fast is almost certainly a script replaying a captured request.
MIN_HUMAN_FILL_SECONDS = 3

_RATE_LIMITED_SUBMISSION_TYPES = ["booking", "four_hand_request"]

# Test numbers (owner request 2026-10-05: the marketing team needs to test the booking flow
# without real appointments or daily limits): the reserved-for-fiction US range 555-0100 to
# 555-0199, any area code, e.g. (619) 555-0123. See is_test_phone.
_TEST_PHONE = re.compile(r"^\+1\d{3}55501\d{2}$")

STUDIO_PHONE_DISPLAY = "(619) 323-1185"

# What the client sees for each rejection (owner request 2026-10-05: say what happened instead of
# one generic error). Bot-only checks (honeypot) keep a neutral message.
_USER_MESSAGES = {
    "rate_limit_phone": (
        "This phone number has reached today's limit of 3 online bookings. To book or change an "
        f"appointment, please call or text us at {STUDIO_PHONE_DISPLAY}."
    ),
    "rate_limit_ip": (
        "Too many bookings from this network in the last hour. Please try again later, or call or "
        f"text us at {STUDIO_PHONE_DISPLAY}."
    ),
    "too_fast": "That was a little too fast for us to verify. Please wait a few seconds and try again.",
    "turnstile_failed": (
        "We couldn't verify the security check. Please refresh the page and try again "
        f"(or call/text us at {STUDIO_PHONE_DISPLAY})."
    ),
}
_GENERIC_MESSAGE = "We couldn't verify your submission. Please try again."


def is_test_phone(phone_e164: str | None) -> bool:
    """(XXX) 555-0100 to 555-0199: numbers reserved for fiction, never a real client."""
    return bool(phone_e164 and _TEST_PHONE.match(phone_e164))


def user_message(reason: str) -> str:
    return _USER_MESSAGES.get(reason, _GENERIC_MESSAGE)


class AbuseGuardError(Exception):
    """Raised when a submission is rejected. The message tells a real client what to do (limit
    reached, refresh the page); only the honeypot keeps the generic one.
    """

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(user_message(reason))


class AbuseGuard:
    """Guards the real booking-creation endpoints (not Step 1 lead capture, which doesn't
    consume real Square calendar inventory) against mass/automated submissions. Checks run
    cheapest-first and stop at the first failure; every rejection is logged to
    marketing.abuse_blocks so the owner portal can show what's being blocked.
    """

    def __init__(self, repository: MarketingRepository):
        self._repository = repository

    async def check(
        self,
        *,
        business_id: int,
        endpoint: str,
        phone_number: str,
        ip_address: str | None,
        honeypot_value: str | None,
        form_rendered_at: str | None,
        turnstile_token: str | None,
    ) -> None:
        if honeypot_value:
            await self._reject(business_id, endpoint, "honeypot", phone_number, ip_address)

        if form_rendered_at:
            elapsed = self._seconds_since(form_rendered_at)
            if elapsed is not None and elapsed < MIN_HUMAN_FILL_SECONDS:
                await self._reject(business_id, endpoint, "too_fast", phone_number, ip_address)

        # Test numbers skip the daily/hourly limits (they never create a real booking, see
        # is_test_phone); the bot checks above and the security check below still apply.
        testing = is_test_phone(phone_number)

        if phone_number and not testing:
            since_day = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
            phone_count = await self._repository.count_recent_submissions_by_phone(
                phone_number=phone_number, submission_types=_RATE_LIMITED_SUBMISSION_TYPES, since=since_day
            )
            if phone_count >= MAX_BOOKING_ATTEMPTS_PER_PHONE_PER_DAY:
                await self._reject(business_id, endpoint, "rate_limit_phone", phone_number, ip_address)

        if ip_address and not testing:
            since_hour = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
            ip_count = await self._repository.count_recent_submissions_by_ip(
                ip_address=ip_address, submission_types=_RATE_LIMITED_SUBMISSION_TYPES, since=since_hour
            )
            if ip_count >= MAX_BOOKING_ATTEMPTS_PER_IP_PER_HOUR:
                await self._reject(business_id, endpoint, "rate_limit_ip", phone_number, ip_address)

        # Last and most expensive (network call to Cloudflare) — cheap checks above already
        # catch naive bots without paying for it.
        if not await verify_turnstile(turnstile_token, ip_address):
            await self._reject(business_id, endpoint, "turnstile_failed", phone_number, ip_address)

    @staticmethod
    def _seconds_since(iso_timestamp: str) -> float | None:
        try:
            rendered_at = dt.datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
        except ValueError:
            return None  # malformed timestamp isn't itself a reason to block — other checks still apply
        return (dt.datetime.now(dt.timezone.utc) - rendered_at).total_seconds()

    async def _reject(
        self, business_id: int, endpoint: str, reason: str, phone_number: str | None, ip_address: str | None
    ) -> None:
        try:
            await self._repository.insert_abuse_block(
                business_id=business_id, endpoint=endpoint, reason=reason, phone_number=phone_number, ip_address=ip_address
            )
        except Exception:
            logger.exception("Failed to log abuse block (rejection still enforced)")
        logger.warning("Rejected %s submission: reason=%s phone=%s ip=%s", endpoint, reason, phone_number, ip_address)
        raise AbuseGuardError(reason)
