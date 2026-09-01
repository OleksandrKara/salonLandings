import { lazy, Suspense } from "react";

// Lazy, not a static import: this one bundle serves every business's landing page (see the host
// resolution below), so a static import of both meant every visitor downloaded BOTH businesses'
// landing-page code before either could render — a mani.akluxnails.com visitor's JS payload
// included all of PMU's page for a page they'd never see, directly delaying LCP (found live
// 2026-09-01: mani's mobile LCP measured 4.9-6.2s across several real PageSpeed runs). Splitting
// these into their own chunks means only the one the visitor actually needs downloads before the
// page can paint.
const LandingPage = lazy(() =>
  import("@/features/landing/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const PmuLandingPage = lazy(() =>
  import("@/features/pmu/PmuLandingPage").then((m) => ({ default: m.PmuLandingPage })),
);

// One static bundle serves every business's landing page — the backend already resolves which
// business a request belongs to from the Host header (see business_context.get_current_business
// on the backend); this is the same resolution, client-side, purely to decide which page to
// render. "pmu-annakara" matches book.pmu-annakara.com (and any future subdomain of the same
// domain) without hardcoding the full hostname.
function App() {
  const isPmu = window.location.hostname.includes("pmu-annakara");
  return <Suspense fallback={null}>{isPmu ? <PmuLandingPage /> : <LandingPage />}</Suspense>;
}

export default App;
