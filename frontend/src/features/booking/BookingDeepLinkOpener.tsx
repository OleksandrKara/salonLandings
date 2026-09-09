import { useEffect } from "react";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";

/**
 * `?autoopen=1` opens this page's own booking modal on mount, no click needed — how
 * pmu-annakara.com's WordPress iframe popup (its manicure-content pages, see the popup's own
 * footer script) opens straight into the booking flow instead of landing on this page's full
 * header/hero first, forcing a second, redundant click inside the iframe (found live 2026-09-09,
 * the WP popup's whole point was skipping exactly that click). Same pattern as PMU's own
 * PmuDeepLinkOpener. Renders nothing; must be mounted inside BookingModalProvider.
 */
export function BookingDeepLinkOpener() {
  const { open } = useBookingModalContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoopen") !== "1") return;

    open();

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
