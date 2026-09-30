from types import SimpleNamespace
from unittest.mock import patch

import httpx

from app.integrations.telegram.notifier import notify_four_hand_request, notify_payment_failed

KWARGS = dict(
    source="mani",
    customer_name="Jane Doe",
    phone_number="+15551234567",
    requested_services="manicure",
    preferred_start_at="2026-08-01T18:00:00Z",
    note=None,
)

PAYMENT_FAILED_KWARGS = dict(
    business_id=2,
    customer_name="Tara Lumley",
    phone_number="+15551234567",
    service_name="Touch-Up",
    amount=100.0,
    error_message="Your card was declined. Please try a different card.",
    error_code="CARD_DECLINED",
    client_error=True,
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


def test_payment_failed_unconfigured_settings_skips_without_raising():
    with patch("app.integrations.telegram.notifier.get_settings", return_value=_settings(None, None)):
        assert notify_payment_failed(**PAYMENT_FAILED_KWARGS) is False


def test_payment_failed_relay_unreachable_returns_false_without_raising():
    with patch(
        "app.integrations.telegram.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", side_effect=httpx.ConnectError("connection refused")):
        assert notify_payment_failed(**PAYMENT_FAILED_KWARGS) is False


def test_payment_failed_relay_success_returns_true():
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.telegram.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response) as mock_post:
        assert notify_payment_failed(**PAYMENT_FAILED_KWARGS) is True
        _, kwargs = mock_post.call_args
        assert kwargs["json"]["businessId"] == 2
        assert kwargs["json"]["clientError"] is True
        assert kwargs["json"]["errorCode"] == "CARD_DECLINED"


# --- consultation alert: source page (2026-09-30) -------------------------------------------

from app.integrations.telegram.notifier import notify_consultation_request  # noqa: E402
from app.services.source_page import clean_ad_campaign, clean_one_line, clean_source_page_url  # noqa: E402


def test_source_page_url_keeps_only_our_https_sites_and_drops_query():
    assert clean_source_page_url("https://pmu-annakara.com/permanent-makeup-lips/?utm_source=ig&fbclid=x#top") == (
        "https://pmu-annakara.com/permanent-makeup-lips/"
    )
    assert clean_source_page_url("https://PMU-Preview.akluxnails.com/permanent-eyeliner") == (
        "https://pmu-preview.akluxnails.com/permanent-eyeliner"
    )
    assert clean_source_page_url("https://book.pmu-annakara.com") == "https://book.pmu-annakara.com/"
    assert clean_source_page_url("http://pmu-annakara.com/lips/") is None
    assert clean_source_page_url("https://evil.example/pmu-annakara.com") is None
    assert clean_source_page_url("https://pmu-annakara.com.evil.example/") is None
    assert clean_source_page_url("javascript:alert(1)") is None
    assert clean_source_page_url(None) is None


def test_title_and_campaign_become_one_short_line():
    assert clean_one_line("  Permanent\nLips |\tAnna Kara  ") == "Permanent Lips | Anna Kara"
    assert clean_one_line("x" * 500).endswith("…") and len(clean_one_line("x" * 500)) == 120
    assert clean_one_line("   ") is None
    assert clean_ad_campaign("lips_sept") == "lips_sept"


def test_consultation_alert_payload_carries_source_page():
    captured = {}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, url, json, headers):
            captured["json"] = json
            return SimpleNamespace(raise_for_status=lambda: None, json=lambda: {"sent": True})

    with patch("app.integrations.telegram.notifier.get_settings", return_value=_settings("http://relay", "k")), patch(
        "app.integrations.telegram.notifier.httpx.Client", FakeClient
    ):
        assert notify_consultation_request(
            business_id=2,
            customer_name="Kalynn",
            phone_number="2405772146",
            start_at="2026-09-29T00:30:00Z",
            is_online=True,
            location_address=None,
            source_page_url="https://pmu-annakara.com/permanent-makeup-lips/",
            source_page_title="Permanent Lips",
            ad_campaign="lips_sept",
        ) is True
    assert captured["json"]["sourcePageUrl"] == "https://pmu-annakara.com/permanent-makeup-lips/"
    assert captured["json"]["sourcePageTitle"] == "Permanent Lips"
    assert captured["json"]["adCampaign"] == "lips_sept"
