from types import SimpleNamespace
from unittest.mock import patch

import httpx

from app.integrations.telegram.notifier import notify_four_hand_request

KWARGS = dict(
    source="mani",
    customer_name="Jane Doe",
    phone_number="+15551234567",
    requested_services="manicure",
    preferred_start_at="2026-08-01T18:00:00Z",
    note=None,
)


def _settings(base_url, key):
    return SimpleNamespace(internal_api_base_url=base_url, internal_api_key=key)


def test_unconfigured_settings_skips_without_raising():
    with patch("app.integrations.telegram.notifier.get_settings", return_value=_settings(None, None)):
        assert notify_four_hand_request(**KWARGS) is False


def test_relay_unreachable_returns_false_without_raising():
    with patch(
        "app.integrations.telegram.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", side_effect=httpx.ConnectError("connection refused")):
        assert notify_four_hand_request(**KWARGS) is False


def test_relay_success_returns_true():
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.telegram.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response):
        assert notify_four_hand_request(**KWARGS) is True
