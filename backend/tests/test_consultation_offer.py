from types import SimpleNamespace
from unittest.mock import patch

import httpx

from app.services.consultation_offer import NO_OFFER, check_offer, claim_offer_safely

_REQ = httpx.Request("GET", "http://backend:8080")


def _settings(base_url="http://backend:8080", key="secret"):
    return SimpleNamespace(internal_api_base_url=base_url, internal_api_key=key)


def test_live_offer_in_dollars_and_only_for_procedures_from_the_minimum():
    response = httpx.Response(200, json={"valid": True, "discountCents": 7500, "minSpendCents": 50000,
                                         "expiresText": "Wednesday, October 14", "firstName": "Sarah"}, request=_REQ)
    with patch("app.services.consultation_offer.get_settings", return_value=_settings()), \
            patch("httpx.Client.get", return_value=response) as get:
        offer = check_offer(2, "41.sig")
    assert offer.valid and offer.discount_amount == 75.0 and offer.min_spend == 500.0
    assert offer.applies_to(500) and offer.applies_to(950)
    assert not offer.applies_to(499)
    assert get.call_args.args[0].endswith("/api/internal/consultation-offer/2")
    assert get.call_args.kwargs["params"] == {"token": "41.sig"}


def test_invalid_missing_or_unreachable_means_no_offer():
    with patch("app.services.consultation_offer.get_settings", return_value=_settings()):
        assert check_offer(2, None) == NO_OFFER
        with patch("httpx.Client.get", return_value=httpx.Response(200, json={"valid": False}, request=_REQ)):
            assert check_offer(2, "41.forged") == NO_OFFER
        with patch("httpx.Client.get", side_effect=httpx.ConnectError("down")):
            assert check_offer(2, "41.sig") == NO_OFFER
    with patch("app.services.consultation_offer.get_settings", return_value=_settings(base_url=None)):
        assert check_offer(2, "41.sig") == NO_OFFER
    assert not NO_OFFER.applies_to(1000)


def test_claim_never_raises():
    with patch("app.services.consultation_offer.get_settings", return_value=_settings()), \
            patch("httpx.Client.post", side_effect=httpx.ConnectError("down")):
        assert claim_offer_safely(business_id=2, token="41.sig", square_customer_id="C", start_at="2026-10-20T17:00:00Z") is False
    with patch("app.services.consultation_offer.get_settings", return_value=_settings()), \
            patch("httpx.Client.post", return_value=httpx.Response(200, json={"applied": True}, request=_REQ)) as post:
        assert claim_offer_safely(business_id=2, token="41.sig", square_customer_id="C", start_at="2026-10-20T17:00:00Z")
    assert post.call_args.kwargs["json"] == {"token": "41.sig", "squareCustomerId": "C", "startAt": "2026-10-20T17:00:00Z"}
