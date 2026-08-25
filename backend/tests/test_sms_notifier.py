from types import SimpleNamespace
from unittest.mock import patch

import httpx

from app.integrations.sms.notifier import (
    _format_preferred_time,
    notify_consultation_request_sms,
    notify_four_hand_request_sms,
)

KWARGS = dict(
    given_name="Jane",
    phone_number="+15551234567",
    preferred_start_at="2026-08-01T18:00:00Z",
)

CONSULTATION_KWARGS = dict(
    given_name="Jane",
    phone_number="+15551234567",
    business_id=2,
    start_at="2026-08-01T18:00:00Z",
)


def _settings(base_url, key):
    return SimpleNamespace(internal_api_base_url=base_url, internal_api_key=key)


def test_unconfigured_settings_skips_without_raising():
    with patch("app.integrations.sms.notifier.get_settings", return_value=_settings(None, None)):
        assert notify_four_hand_request_sms(**KWARGS) is False


def test_relay_unreachable_returns_false_without_raising():
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", side_effect=httpx.ConnectError("connection refused")):
        assert notify_four_hand_request_sms(**KWARGS) is False


def test_relay_success_returns_true():
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response):
        assert notify_four_hand_request_sms(**KWARGS) is True


def test_relay_blocked_by_consent_returns_false():
    response = httpx.Response(
        200, json={"sent": False, "reason": "no_consent"}, request=httpx.Request("POST", "http://backend:8080")
    )
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response):
        assert notify_four_hand_request_sms(**KWARGS) is False


def test_consultation_unconfigured_settings_skips_without_raising():
    with patch("app.integrations.sms.notifier.get_settings", return_value=_settings(None, None)):
        assert notify_consultation_request_sms(**CONSULTATION_KWARGS) is False


def test_consultation_relay_unreachable_returns_false_without_raising():
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", side_effect=httpx.ConnectError("connection refused")):
        assert notify_consultation_request_sms(**CONSULTATION_KWARGS) is False


def test_consultation_relay_success_returns_true():
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response) as post:
        assert notify_consultation_request_sms(**CONSULTATION_KWARGS) is True
        # business_id must actually reach the relay payload — this is the one field that
        # distinguishes a business-2 send from the legacy-default behavior every other caller
        # of this relay still gets (see InternalNotificationController.SmsSendRequest's own doc).
        assert post.call_args.kwargs["json"]["businessId"] == 2
        assert "businessName" not in post.call_args.kwargs["json"]["variables"]


def test_consultation_relay_blocked_returns_false():
    response = httpx.Response(
        200, json={"sent": False, "reason": "unknown_business"}, request=httpx.Request("POST", "http://backend:8080")
    )
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response):
        assert notify_consultation_request_sms(**CONSULTATION_KWARGS) is False


def test_format_preferred_time_converts_utc_to_pacific():
    # 2026-08-01T18:00:00Z is 11:00 AM Pacific (PDT, UTC-7) in August.
    assert _format_preferred_time("2026-08-01T18:00:00Z") == "Sat, Aug 1 at 11:00 AM PDT"


def test_format_preferred_time_falls_back_on_malformed_input():
    assert _format_preferred_time("not-a-timestamp") == "not-a-timestamp"
