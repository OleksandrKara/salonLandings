import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.services.abuse_guard import AbuseGuard, AbuseGuardError, is_test_phone, user_message


def test_test_phone_range_is_555_0100_to_0199_only():
    assert is_test_phone("+16195550123")
    assert is_test_phone("+18585550100")
    assert not is_test_phone("+16195550200")
    assert not is_test_phone("+16195551234")
    assert not is_test_phone("+380501234567")
    assert not is_test_phone(None)


def test_rejections_tell_the_client_what_happened():
    assert "today's limit of 3 online bookings" in user_message("rate_limit_phone")
    assert "(619) 323-1185" in user_message("rate_limit_phone")
    assert "refresh the page" in user_message("turnstile_failed")
    assert user_message("honeypot") == "We couldn't verify your submission. Please try again."


def _guard(phone_count: int):
    repo = AsyncMock()
    repo.count_recent_submissions_by_phone.return_value = phone_count
    repo.count_recent_submissions_by_ip.return_value = 0
    return AbuseGuard(repo)


def _check(guard: AbuseGuard, phone: str):
    return guard.check(
        business_id=2, endpoint="pmu_consultation", phone_number=phone, ip_address="1.2.3.4",
        honeypot_value=None, form_rendered_at=None, turnstile_token="t",
    )


def test_real_number_over_the_daily_limit_is_rejected_with_the_limit_message():
    with patch("app.services.abuse_guard.verify_turnstile", AsyncMock(return_value=True)):
        with pytest.raises(AbuseGuardError) as exc:
            asyncio.run(_check(_guard(3), "+18583372974"))
    assert exc.value.reason == "rate_limit_phone"
    assert "today's limit" in str(exc.value)


def test_test_number_skips_the_limits_but_not_the_security_check():
    with patch("app.services.abuse_guard.verify_turnstile", AsyncMock(return_value=True)):
        asyncio.run(_check(_guard(50), "+16195550123"))  # no exception
    with patch("app.services.abuse_guard.verify_turnstile", AsyncMock(return_value=False)):
        with pytest.raises(AbuseGuardError) as exc:
            asyncio.run(_check(_guard(0), "+16195550123"))
    assert exc.value.reason == "turnstile_failed"
