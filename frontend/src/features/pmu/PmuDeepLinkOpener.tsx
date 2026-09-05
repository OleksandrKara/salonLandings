import { useEffect } from "react";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";

/**
 * Opens the deposit-booking modal for a technique slug passed in the URL (e.g.
 * `?book=touch-up`) — how emailed touch-up/color-booster reminders link straight to their
 * specific service, since those two techniques are deliberately left off the public landing
 * page's own technique list (see pmu_catalog.py) and so have no on-page button to click instead.
 * Renders nothing; must be mounted inside PmuBookingModalProvider.
 */
export function PmuDeepLinkOpener() {
  const { openDeposit } = usePmuBookingModalContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("book");
    if (!slug) return;

    openDeposit(slug);

    params.delete("book");
    const rest = params.toString();
    const url = window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash;
    window.history.replaceState(null, "", url);
    // Deliberately run once on mount only — this reflects the URL the page loaded with, not a
    // live subscription to it changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
