from types import SimpleNamespace
from unittest.mock import patch

import httpx

from app.services.rebooking_promo import (
    PromoTerms,
    enroll_rebooking_promo_safely,
    verify_and_fetch_promo_terms,
)


def _settings(base_url=None, key=None):
    return SimpleNamespace(internal_api_base_url=base_url, internal_api_key=key)


def test_verify_unconfigured_internal_api_returns_not_valid():
    with patch("app.services.rebooking_promo.get_settings", return_value=_settings()):
        terms = verify_and_fetch_promo_terms("REBOOK10", 1700000000, "sig", 2)
    assert terms == PromoTerms(valid=False, discount_amount=None, min_spend=None)


def test_verify_converts_cents_to_dollars_on_success():
    response = httpx.Response(
        200,
        json={"valid": True, "discountCents": 1500, "minSpendCents": 30000},
        request=httpx.Request("GET", "http://backend:8080"),
    )
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.get", return_value=response) as mock_get:
        terms = verify_and_fetch_promo_terms("REBOOK10", 1700000000, "sig123", 2)
    assert terms == PromoTerms(valid=True, discount_amount=15.0, min_spend=300.0)
    sent_params = mock_get.call_args.kwargs["params"]
    assert sent_params == {
        "promoCode": "REBOOK10",
        "expEpochSeconds": 1700000000,
        "signature": "sig123",
        "businessId": 2,
    }


def test_verify_invalid_response_returns_not_valid():
    response = httpx.Response(200, json={"valid": False}, request=httpx.Request("GET", "http://backend:8080"))
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.get", return_value=response):
        terms = verify_and_fetch_promo_terms("REBOOK10", 1700000000, "bogus", 2)
    assert terms.valid is False


def test_verify_relay_unreachable_returns_not_valid_without_raising():
    with patch(
        "app.services.rebooking_promo.get_settings",
        return_value=_settings(base_url="http://backend:8080", key="secret"),
    ), patch("httpx.Client.get", side_effect=httpx.ConnectError("connection refused")):
        terms = verify_and_fetch_promo_terms("REBOOK10", 1700000000, "sig", 2)
    assert terms.valid is False


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
