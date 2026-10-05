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
    is_online=True,
    location_address="",
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
        assert post.call_args.kwargs["json"]["variables"]["businessName"] == "Anna Kara's PMU Studio"


def test_consultation_online_clause_says_call():
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response) as post:
        notify_consultation_request_sms(**{**CONSULTATION_KWARGS, "is_online": True, "location_address": "123 Main St"})
        clause = post.call_args.kwargs["json"]["variables"]["detailsClause"]
        assert clause.startswith("It's a free online consultation by phone: your artist will call you at this number on Sat, Aug 1 at 11:00 AM PDT, no need to come to the studio.")
        assert "reply with 2-3 photos" in clause and "arrive" not in clause
        # An online consultation's clause never mentions the studio address, even if one happens
        # to be passed in.
        assert "Main St" not in clause


def test_consultation_in_person_clause_includes_address():
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response) as post:
        notify_consultation_request_sms(**{**CONSULTATION_KWARGS, "is_online": False, "location_address": "123 Main St, San Diego, CA 92101"})
        clause = post.call_args.kwargs["json"]["variables"]["detailsClause"]
        assert clause.startswith("It's an in-studio consultation at 123 Main St, San Diego, CA 92101 on Sat, Aug 1 at 11:00 AM PDT. Please arrive 5 minutes early.")
        assert "reply with 2-3 photos" in clause


def test_consultation_in_person_missing_address_omits_at_address_clause():
    # A resolvable-but-empty address (e.g. Square location lookup failed upstream) must not
    # produce a broken "at , at <time>" fragment.
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response) as post:
        notify_consultation_request_sms(**{**CONSULTATION_KWARGS, "is_online": False, "location_address": ""})
        clause = post.call_args.kwargs["json"]["variables"]["detailsClause"]
        assert clause.startswith("It's an in-studio consultation on Sat, Aug 1 at 11:00 AM PDT.")


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


def test_consultation_online_clause_names_the_artist():
    response = httpx.Response(200, json={"sent": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.integrations.sms.notifier.get_settings",
        return_value=_settings("http://backend:8080", "secret"),
    ), patch("httpx.Client.post", return_value=response) as post:
        notify_consultation_request_sms(**{**CONSULTATION_KWARGS, "is_online": True, "location_address": "", "artist_name": "Anna K."})
        clause = post.call_args.kwargs["json"]["variables"]["detailsClause"]
        assert "Anna K. will call you at this number" in clause
        assert "To help Anna K. prepare" in clause


def test_consultation_clause_is_plain_gsm_text():
    # Emoji or curly quotes switch the whole SMS to UCS-2 (70 chars per segment instead of 160):
    # owner asked to keep these texts cheap (2026-10-05).
    from app.integrations.sms.notifier import consultation_details_clause

    for online in (True, False):
        clause = consultation_details_clause(start_at="2026-08-01T18:00:00Z", is_online=online, location_address="1357 Seventh Ave, Ste C, San Diego, CA 92101", artist_name="Anna K.")
        assert clause.isascii()
        assert "brows" not in clause
