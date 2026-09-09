import { useEffect } from "react";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";

/**
 * Opens a booking modal straight from a URL trigger, no click needed. Two independent triggers:
 *
 *   ?book=<technique-slug>  — deposit-booking modal for that technique (e.g. `?book=touch-up`),
 *     how emailed touch-up/color-booster reminders link straight to their specific service, since
 *     those two techniques are deliberately left off the public landing page's own technique list
 *     (see pmu_catalog.py) and so have no on-page button to click instead.
 *
 *   ?autoopen=1  — the default "online-consultation" modal, same as clicking "Book Free
 *     Consultation" — how pmu-annakara.com's WordPress iframe popup opens straight into the
 *     booking flow instead of landing on this page's own full header/hero first, forcing a
 *     second, redundant click inside the iframe (found live 2026-09-09, the WP popup's whole
 *     point was skipping exactly that click).
 *
 * Renders nothing; must be mounted inside PmuBookingModalProvider.
 */
export function PmuDeepLinkOpener() {
  const { openDeposit, openConsultation } = usePmuBookingModalContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("book");
    const autoOpen = params.get("autoopen") === "1";
    if (!slug && !autoOpen) return;

    if (slug) openDeposit(slug);
    else openConsultation();

    params.delete("book");
    params.delete("autoopen");
    const rest = params.toString();
    const url = window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash;
    window.history.replaceState(null, "", url);
    // Deliberately run once on mount only — this reflects the URL the page loaded with, not a
    // live subscription to it changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
