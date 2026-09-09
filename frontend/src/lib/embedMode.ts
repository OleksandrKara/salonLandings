/**
 * True when this page loaded with `?embed=1` — pmu-annakara.com's WordPress iframe popup uses
 * this (alongside `?autoopen=1`, see the deep-link openers) to get just the booking form filling
 * the iframe, not this site's own full header/hero with the modal floating over a dimmed copy of
 * it — a "popup inside a popup" look, reported live 2026-09-09.
 *
 * Captured once at module load, before either deep-link opener's effect strips its own query
 * params via history.replaceState — reading window.location.search again later in the session
 * (e.g. from the close handler, well after that stripping already ran) would silently always see
 * `embed` gone.
 */
export const isEmbedMode =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1";

/** Posted to the parent window when the booking modal closes in embed mode, so the WordPress
 * popup script (which owns the actual overlay/iframe wrapping this page) closes itself too —
 * without this, closing the modal would leave an empty iframe with nothing in it, since embed
 * mode never renders this site's own page content behind the modal as a fallback. */
export function notifyParentToClose(): void {
  if (!isEmbedMode || window.parent === window) return;
  window.parent.postMessage({ source: "ak-booking", type: "close" }, "*");
}
