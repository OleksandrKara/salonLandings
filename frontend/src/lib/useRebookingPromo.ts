import { useEffect, useState } from "react";
import { verifyRebookingPromo } from "@/api/promos";
import type { PromoAttempt } from "@/types/api";

export interface RebookingPromoBannerState {
  discountAmount: number;
  expiresAtMs: number;
}

interface RebookingPromoState {
  // null while unverified/not-present/invalid — the banner and the booking-submission
  // pass-through both key off this being non-null, so there's exactly one source of truth for
  // "is there a live, real coupon on this page load."
  banner: RebookingPromoBannerState | null;
  promoAttempt: PromoAttempt | null;
}

/** Reads promo/exp/sig from the page's own query string once on mount and verifies them
 * server-side (the signing secret never touches the browser) — see api/promos.ts and
 * salaryReview-dev's ShortLinkController, which is what generated this link in the first place.
 * An invalid/expired/not-yet-configured-for-this-business link resolves to the same "nothing to
 * show" state as no promo params at all; the page never distinguishes why to a visitor. */
export function useRebookingPromo(): RebookingPromoState {
  const [state, setState] = useState<RebookingPromoState>({ banner: null, promoAttempt: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("promo");
    const expRaw = params.get("exp");
    const signature = params.get("sig");
    const expEpochSeconds = expRaw ? Number(expRaw) : NaN;
    if (!code || !signature || !Number.isFinite(expEpochSeconds)) return;

    let cancelled = false;
    verifyRebookingPromo(code, expEpochSeconds, signature)
      .then((result) => {
        if (cancelled || !result.valid || result.discount_amount === null) return;
        setState({
          banner: { discountAmount: result.discount_amount, expiresAtMs: expEpochSeconds * 1000 },
          promoAttempt: { code, exp_epoch_seconds: expEpochSeconds, signature },
        });
      })
      .catch(() => {
        // Verify-only failure — no promo state, same as if the params were never present.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
