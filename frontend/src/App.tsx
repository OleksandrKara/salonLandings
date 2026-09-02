import { lazy, Suspense, useEffect } from "react";
import { apiGet } from "@/api/client";

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

// This SPA has no server-side templating at all (see index.html — nginx serves the built dist/
// directly), so unlike akluxnails-home's next/script injection in its layout, there's no way to
// inject Clarity's tag server-side/pre-render here — it has to happen client-side, once, on app
// mount. The backend resolves the project id from the request's own Host header (same resolution
// LandingPage's isPmu check does client-side), so nothing here needs to know mani vs. pmu itself.
function useClarityTracking() {
  useEffect(() => {
    let cancelled = false;
    apiGet<{ clarity_project_id: string | null }>("/api/tracking/clarity-config")
      .then(({ clarity_project_id }) => {
        if (cancelled || !clarity_project_id || document.getElementById("clarity-init")) return;
        const script = document.createElement("script");
        script.id = "clarity-init";
        script.text = `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarity_project_id}");
        `;
        document.head.appendChild(script);
      })
      .catch(() => {
        // Analytics must never break the page — same guarantee as every other tracking call here.
      });
    return () => {
      cancelled = true;
    };
  }, []);
}

// One static bundle serves every business's landing page — the backend already resolves which
// business a request belongs to from the Host header (see business_context.get_current_business
// on the backend); this is the same resolution, client-side, purely to decide which page to
// render. "pmu-annakara" matches book.pmu-annakara.com (and any future subdomain of the same
// domain) without hardcoding the full hostname.
function App() {
  useClarityTracking();
  const isPmu = window.location.hostname.includes("pmu-annakara");
  return <Suspense fallback={null}>{isPmu ? <PmuLandingPage /> : <LandingPage />}</Suspense>;
}

export default App;
