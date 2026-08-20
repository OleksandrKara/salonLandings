import time

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from app.core.business_context import BusinessContext, get_current_business
from app.domain.schemas import PromoVerifyResponse
from app.services.rebooking_promo import fetch_promo_terms, verify_rebooking_promo_signature

router = APIRouter(prefix="/api/promos", tags=["promos"])


@router.get("/verify", response_model=PromoVerifyResponse)
async def verify_promo(
    code: str,
    exp: int,
    sig: str,
    business: BusinessContext = Depends(get_current_business),
) -> PromoVerifyResponse:
    """Server-side check for the promo/exp/sig query params a landing page loaded with — the
    frontend never holds the shared signing secret, same reasoning as akluxnails-home's own
    /api/rebooking-promo/verify route. Also returns the live discount amount/minimum spend
    (resolved fresh here, not trusted from the URL) so the banner never shows a stale figure."""
    if exp < time.time() or not verify_rebooking_promo_signature(code, exp, sig):
        return PromoVerifyResponse(valid=False)
    terms = await run_in_threadpool(fetch_promo_terms, code, business.id)
    if not terms.configured:
        return PromoVerifyResponse(valid=False)
    return PromoVerifyResponse(valid=True, discount_amount=terms.discount_amount, min_spend=terms.min_spend)
