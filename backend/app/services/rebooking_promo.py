"""Same-day-rebooking-discount / customer-winback SMS coupon links — verification + live terms
lookup, and post-booking enrollment against salaryReview's internal API. Mirrors
akluxnails-home's lib/rebookingPromoEnroll.ts (see openspec/changes/same-day-rebooking-discount
design.md D8/D9 in the salaryReview-dev repo), now generalized to any business via a numeric
business_id instead of that app's Business-A-only assumption.

Deliberately holds no signing secret of its own — the HMAC verification lives entirely in
salaryReview-dev (see InternalNotificationController#verifyRebookingPromo), reached over the
same X-Internal-Api-Key channel every other internal call already uses. A landing-page deployment
needing its own copy of a shared signing secret (the way akluxnails-home's own
REBOOKING_PROMO_SECRET works) is an operational footgun for zero benefit — the secret isn't
business-specific, so there's nothing for a new business owner to configure here at all.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT_SECONDS = 5.0


@dataclass(frozen=True)
class PromoTerms:
    valid: bool
    discount_amount: float | None
    min_spend: float | None


def verify_and_fetch_promo_terms(code: str, exp_epoch_seconds: int, signature: str, business_id: int) -> PromoTerms:
    """Verifies the promo/exp/sig a landing page loaded with AND returns the live discount
    amount/minimum spend in one round trip — both live entirely in salaryReview-dev (see module
    doc). Any failure (unreachable, unconfigured internal API, bad signature, expired, or the
    business simply hasn't set this promo up) resolves to the same not-valid outcome — a landing
    page never needs to distinguish why to a visitor."""
    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        return PromoTerms(valid=False, discount_amount=None, min_spend=None)
    try:
        with httpx.Client(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{settings.internal_api_base_url}/api/internal/rebooking-promo/verify",
                params={
                    "promoCode": code,
                    "expEpochSeconds": exp_epoch_seconds,
                    "signature": signature,
                    "businessId": business_id,
                },
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
        response.raise_for_status()
        data = response.json()
        if not data.get("valid"):
            return PromoTerms(valid=False, discount_amount=None, min_spend=None)
        discount_cents = data.get("discountCents")
        min_spend_cents = data.get("minSpendCents")
        return PromoTerms(
            valid=True,
            discount_amount=discount_cents / 100 if discount_cents is not None else None,
            min_spend=min_spend_cents / 100 if min_spend_cents is not None else None,
        )
    except httpx.HTTPError:
        logger.warning("Failed to verify rebooking promo for business %s", business_id, exc_info=True)
        return PromoTerms(valid=False, discount_amount=None, min_spend=None)


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
    independently re-verified on salaryReview's side (see InternalNotificationController) before
    any enrollment happens; this call alone proves nothing on its own."""
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
