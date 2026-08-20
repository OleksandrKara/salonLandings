"""Same-day-rebooking-discount / customer-winback SMS coupon links — verification, live terms
lookup, and post-booking enrollment against salaryReview's internal API. Mirrors
akluxnails-home's lib/rebookingPromo.ts + lib/rebookingPromoEnroll.ts (see
openspec/changes/same-day-rebooking-discount design.md D8/D9 in the salaryReview-dev repo), now
generalized to any business via a numeric business_id instead of that app's Business-A-only
assumption.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT_SECONDS = 5.0


def verify_rebooking_promo_signature(code: str, exp_epoch_seconds: int, signature: str | None) -> bool:
    """Fails closed: a missing secret or any malformed input returns False rather than treating
    an unsignable/unverifiable link as valid."""
    settings = get_settings()
    secret = settings.rebooking_promo_secret
    if not secret or not signature:
        return False
    expected = hmac.new(
        secret.encode("utf-8"), f"{code}.{exp_epoch_seconds}".encode("utf-8"), hashlib.sha256
    ).digest()
    expected_b64 = _b64url_no_pad(expected)
    return hmac.compare_digest(expected_b64, signature)


def _b64url_no_pad(raw: bytes) -> str:
    import base64

    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


@dataclass(frozen=True)
class PromoTerms:
    configured: bool
    discount_amount: float | None
    min_spend: float | None


def fetch_promo_terms(promo_code: str, business_id: int) -> PromoTerms:
    """Live-resolved (not baked into the signed link) so an owner's amount edit takes effect on
    the next click, matching salaryReview's own click-time-resolution philosophy for this feature.
    Any failure resolves to "not configured" — never a guessed/default amount."""
    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        return PromoTerms(configured=False, discount_amount=None, min_spend=None)
    try:
        with httpx.Client(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{settings.internal_api_base_url}/api/internal/rebooking-promo/terms",
                params={"promoCode": promo_code, "businessId": business_id},
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
        response.raise_for_status()
        data = response.json()
        if not data.get("configured"):
            return PromoTerms(configured=False, discount_amount=None, min_spend=None)
        discount_cents = data.get("discountCents")
        min_spend_cents = data.get("minSpendCents")
        return PromoTerms(
            configured=True,
            discount_amount=discount_cents / 100 if discount_cents is not None else None,
            min_spend=min_spend_cents / 100 if min_spend_cents is not None else None,
        )
    except httpx.HTTPError:
        logger.warning("Failed to fetch rebooking promo terms for business %s", business_id, exc_info=True)
        return PromoTerms(configured=False, discount_amount=None, min_spend=None)


def enroll_rebooking_promo_safely(
    *,
    square_customer_id: str,
    exp_epoch_seconds: int,
    signature: str,
    promo_code: str,
    business_id: int,
    customer_name: str | None,
    phone_number: str | None,
    appointment_start_at: str | None,
) -> None:
    """Best-effort, never raises — the booking itself has already succeeded by the time this is
    called, so a failure here must never surface as a failed booking. The signature is
    re-verified independently on salaryReview's side (see InternalNotificationController); this
    call alone proves nothing on its own."""
    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        logger.warning("Rebooking-promo enroll skipped — internal API not configured")
        return
    try:
        with httpx.Client(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = client.post(
                f"{settings.internal_api_base_url}/api/internal/rebooking-promo/enroll",
                json={
                    "squareCustomerId": square_customer_id,
                    "expEpochSeconds": exp_epoch_seconds,
                    "signature": signature,
                    "promoCode": promo_code,
                    "businessId": business_id,
                    "customerName": customer_name,
                    "phoneNumber": phone_number,
                    "appointmentStartAt": appointment_start_at,
                },
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
        if response.status_code != 200:
            logger.warning("Rebooking-promo enroll relay responded %s", response.status_code)
    except Exception:
        logger.exception("Rebooking-promo enroll failed (booking itself was unaffected)")
