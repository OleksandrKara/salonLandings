"""Personal $75 OFF links from the PMU consultation follow-up / re-engagement emails (owner request
2026-10-07): pmu-annakara.com/?book=procedure&offer=<token>. The token is checked by salaryReview
(InternalConsultationOfferController), which holds the signing secret and the offer itself; this
module only asks it whether an offer is live, and tells it about a booking made through one, so
the booked Square customer keeps the discount until the visit. Any failure reads as "no offer":
the popup then simply shows regular prices.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 5.0


@dataclass(frozen=True)
class ConsultationOffer:
    valid: bool
    discount_amount: float = 0.0
    min_spend: float = 0.0
    expires_text: str | None = None
    first_name: str | None = None

    def applies_to(self, price: float) -> bool:
        return self.valid and self.discount_amount > 0 and price >= self.min_spend


NO_OFFER = ConsultationOffer(valid=False)


def check_offer(business_id: int, token: str | None) -> ConsultationOffer:
    settings = get_settings()
    if not token or not settings.internal_api_base_url or not settings.internal_api_key:
        return NO_OFFER
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
            response = client.get(
                f"{settings.internal_api_base_url}/api/internal/consultation-offer/{business_id}",
                params={"token": token},
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError):
        logger.warning("Consultation offer check failed for business %s", business_id, exc_info=True)
        return NO_OFFER
    if not data.get("valid"):
        return NO_OFFER
    return ConsultationOffer(
        valid=True,
        discount_amount=(data.get("discountCents") or 0) / 100,
        min_spend=(data.get("minSpendCents") or 0) / 100,
        expires_text=data.get("expiresText"),
        first_name=data.get("firstName"),
    )


def claim_offer_safely(*, business_id: int, token: str, square_customer_id: str, start_at: str) -> bool:
    """After a real booking through a personal link: salaryReview keeps the booked customer in the
    discount group until two days after the visit. Never raises; the booking itself already
    succeeded."""
    settings = get_settings()
    if not settings.internal_api_base_url or not settings.internal_api_key:
        return False
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
            response = client.post(
                f"{settings.internal_api_base_url}/api/internal/consultation-offer/{business_id}/claim",
                json={"token": token, "squareCustomerId": square_customer_id, "startAt": start_at},
                headers={"X-Internal-Api-Key": settings.internal_api_key},
            )
        response.raise_for_status()
        return bool(response.json().get("applied"))
    except (httpx.HTTPError, ValueError):
        logger.error("Consultation offer claim failed for business %s customer %s", business_id, square_customer_id, exc_info=True)
        return False
