import base64
import hashlib
import hmac
from types import SimpleNamespace
from unittest.mock import patch

import httpx

from app.services.rebooking_promo import (
    PromoTerms,
    enroll_rebooking_promo_safely,
    fetch_promo_terms,
    verify_rebooking_promo_signature,
)


def _settings(secret=None, base_url=None, key=None):
    return SimpleNamespace(rebooking_promo_secret=secret, internal_api_base_url=base_url, internal_api_key=key)


def _sign(secret: str, code: str, exp: int) -> str:
    raw = hmac.new(secret.encode("utf-8"), f"{code}.{exp}".encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def test_verify_matches_a_correctly_signed_link():
    sig = _sign("s3cr3t", "REBOOK10", 1700000000)
    with patch("app.services.rebooking_promo.get_settings", return_value=_settings(secret="s3cr3t")):
        assert verify_rebooking_promo_signature("REBOOK10", 1700000000, sig) is True


def test_verify_rejects_a_wrong_signature():
    with patch("app.services.rebooking_promo.get_settings", return_value=_settings(secret="s3cr3t")):
        assert verify_rebooking_promo_signature("REBOOK10", 1700000000, "bogus") is False


def test_verify_fails_closed_when_secret_unconfigured():
    sig = _sign("s3cr3t", "REBOOK10", 1700000000)
    with patch("app.services.rebooking_promo.get_settings", return_value=_settings(secret=None)):
        assert verify_rebooking_promo_signature("REBOOK10", 1700000000, sig) is False


def test_verify_fails_closed_on_missing_signature():
    with patch("app.services.rebooking_promo.get_settings", return_value=_settings(secret="s3cr3t")):
        assert verify_rebooking_promo_signature("REBOOK10", 1700000000, None) is False


def test_fetch_terms_unconfigured_internal_api_returns_not_configured():
    with patch("app.services.rebooking_promo.get_settings", return_value=_settings()):
        terms = fetch_promo_terms("REBOOK10", 2)
    assert terms == PromoTerms(configured=False, discount_amount=None, min_spend=None)


def test_fetch_terms_converts_cents_to_dollars():
    response = httpx.Response(
        200,
        json={"configured": True, "discountCents": 1500, "minSpendCents": 30000},
        request=httpx.Request("GET", "http://backend:8080"),
    )
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.get", return_value=response):
        terms = fetch_promo_terms("REBOOK10", 2)
    assert terms == PromoTerms(configured=True, discount_amount=15.0, min_spend=300.0)


def test_fetch_terms_not_configured_business_returns_not_configured():
    response = httpx.Response(
        200, json={"configured": False}, request=httpx.Request("GET", "http://backend:8080")
    )
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.get", return_value=response):
        terms = fetch_promo_terms("REBOOK10", 2)
    assert terms.configured is False


def test_fetch_terms_relay_unreachable_returns_not_configured_without_raising():
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.get", side_effect=httpx.ConnectError("connection refused")):
        terms = fetch_promo_terms("REBOOK10", 2)
    assert terms.configured is False


def test_enroll_unconfigured_internal_api_never_raises():
    with patch("app.services.rebooking_promo.get_settings", return_value=_settings()):
        enroll_rebooking_promo_safely(
            square_customer_id="cust1", exp_epoch_seconds=1700000000, signature="sig",
            promo_code="REBOOK10", business_id=2, customer_name="Jane", phone_number="+15551234567",
            appointment_start_at="2026-08-01T18:00:00Z",
        )


def test_enroll_relay_unreachable_never_raises():
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.post", side_effect=httpx.ConnectError("connection refused")):
        enroll_rebooking_promo_safely(
            square_customer_id="cust1", exp_epoch_seconds=1700000000, signature="sig",
            promo_code="REBOOK10", business_id=2, customer_name="Jane", phone_number="+15551234567",
            appointment_start_at="2026-08-01T18:00:00Z",
        )


def test_enroll_sends_business_id_and_promo_code():
    response = httpx.Response(200, json={"enrolled": True}, request=httpx.Request("POST", "http://backend:8080"))
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.post", return_value=response) as mock_post:
        enroll_rebooking_promo_safely(
            square_customer_id="cust1", exp_epoch_seconds=1700000000, signature="sig",
            promo_code="WINBACK5", business_id=2, customer_name="Jane", phone_number="+15551234567",
            appointment_start_at="2026-08-01T18:00:00Z",
        )
    sent_json = mock_post.call_args.kwargs["json"]
    assert sent_json["businessId"] == 2
    assert sent_json["promoCode"] == "WINBACK5"
    assert sent_json["squareCustomerId"] == "cust1"
