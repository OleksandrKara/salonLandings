from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from app.core.business_context import BusinessContext, get_current_business
from app.domain.schemas import PromoVerifyResponse
from app.services.rebooking_promo import verify_and_fetch_promo_terms

router = APIRouter(prefix="/api/promos", tags=["promos"])


@router.get("/verify", response_model=PromoVerifyResponse)
async def verify_promo(
    code: str,
    exp: int,
    sig: str,
    business: BusinessContext = Depends(get_current_business),
) -> PromoVerifyResponse:
    """Server-side check for the promo/exp/sig query params a landing page loaded with — proxies
    straight to salaryReview-dev, which holds the only copy of the signing secret anywhere (see
    rebooking_promo.py's own module doc for why). Also returns the live discount amount/minimum
    spend (resolved fresh, not trusted from the URL) so the banner never shows a stale figure."""
    terms = await run_in_threadpool(verify_and_fetch_promo_terms, code, exp, sig, business.id)
    if not terms.valid:
        return PromoVerifyResponse(valid=False)
    return PromoVerifyResponse(valid=True, discount_amount=terms.discount_amount, min_spend=terms.min_spend)
