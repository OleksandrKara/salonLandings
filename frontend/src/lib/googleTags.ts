/**
 * GA4 and Google Ads on book.pmu-annakara.com (owner request 2026-10-06: the PPC team needs to
 * track and advertise this page too). Same IDs as pmu-annakara.com (pmu-annakara-home
 * components/ThirdPartyScripts.tsx): GA4 G-XTPZZV1DKR, Google Ads AW-830249908. Both sites share
 * the pmu-annakara.com cookie domain, so GA4 sees a visitor moving between them as one user.
 *
 * The page's GTM container is the team's own GTM-TSFP3TND, injected by nginx
 * (nginx/book.pmu-annakara.com.conf); it reads the booking events below from the shared dataLayer.
 * GA4 page views and the GA4 events go out directly via gtag here, so the container must not add
 * its own GA4 page_view or copies of these events.
 *
 * PMU host only (mani.akluxnails.com never loads these), and never in ?embed=1 mode, where the
 * page sits inside another site's popup that already has its own tags.
 *
 * Booking events mirror pmu-annakara.com's BookingOverlay so the team's GTM triggers and Ads
 * conversions work the same on both: consultation_start, consultation_slot_selected,
 * consultation_booked (a test booking only gets a dataLayer entry marked test_booking: true, no
 * GA4 event and no Ads conversion), plus the old WordPress conversion names Ads still optimizes on.
 */
const GA4_ID = "G-XTPZZV1DKR";
const GOOGLE_ADS_ID = "AW-830249908";

type Gtag = (...args: unknown[]) => void;
type TagWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag };

let installed = false;

export function installGoogleTags(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const w = window as TagWindow;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", GA4_ID);
  w.gtag("config", GOOGLE_ADS_ID);
  addScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
  addScript(`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`);
}

function addScript(src: string): void {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function pushDataLayer(event: string, params: Record<string, unknown>): void {
  try {
    const w = window as TagWindow;
    (w.dataLayer = w.dataLayer || []).push({ event, ...params });
  } catch {
    // analytics only
  }
}

/** dataLayer entry for GTM plus a direct GA4 event. */
export function trackEvent(event: string, params: Record<string, unknown> = {}): void {
  if (!installed) return;
  const p = { page_path: window.location.pathname, ...params };
  pushDataLayer(event, p);
  try {
    (window as TagWindow).gtag?.("event", event, p);
  } catch {
    // analytics only
  }
}

/** Test booking (a (XXX) 555-01xx number, see the backend's abuse_guard.is_test_phone): visible in
 * GTM Preview only, so a test never counts as a GA4 key event or an Ads conversion. */
export function trackTestBooking(event: string, params: Record<string, unknown> = {}): void {
  if (!installed) return;
  pushDataLayer(event, { page_path: window.location.pathname, ...params, test_booking: true });
}

/** The old WordPress site's conversion events, still what Google Ads bids on: opening booking
 * (ads_conversion_Book_Now_1, View_page_book_now) and a booked consultation (generate_lead,
 * free_consultation_form). GA4 only via gtag, no dataLayer push, same as pmu-annakara.com. */
export function legacyAdsEvents(names: string[]): void {
  if (!installed) return;
  try {
    const gtag = (window as TagWindow).gtag;
    for (const name of names) gtag?.("event", name, { page_path: window.location.pathname });
  } catch {
    // analytics only
  }
}
