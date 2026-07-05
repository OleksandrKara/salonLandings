const THANK_YOU_PATH = "/thank-you";

let returnUrl: string | null = null;

/**
 * Gives completed bookings a distinct, shareable URL so ad platforms (Meta/Google)
 * can target a "thank you page visit" as a conversion event, without a real page
 * reload — the booking modal's confirmation UI is unaffected.
 */
export function enterThankYouUrl(): void {
  if (window.location.pathname === THANK_YOU_PATH) return;
  returnUrl = window.location.pathname + window.location.search + window.location.hash;
  window.history.pushState({ akluxThankYou: true }, "", THANK_YOU_PATH);
}

export function exitThankYouUrl(): void {
  if (window.location.pathname !== THANK_YOU_PATH) return;
  window.history.replaceState({}, "", returnUrl ?? "/");
  returnUrl = null;
}

export function isOnThankYouUrl(): boolean {
  return window.location.pathname === THANK_YOU_PATH;
}
