import { LandingPage } from "@/features/landing/LandingPage";
import { PmuLandingPage } from "@/features/pmu/PmuLandingPage";

// One static bundle serves every business's landing page — the backend already resolves which
// business a request belongs to from the Host header (see business_context.get_current_business
// on the backend); this is the same resolution, client-side, purely to decide which page to
// render. "pmu-annakara" matches book.pmu-annakara.com (and any future subdomain of the same
// domain) without hardcoding the full hostname.
function App() {
  const isPmu = window.location.hostname.includes("pmu-annakara");
  return isPmu ? <PmuLandingPage /> : <LandingPage />;
}

export default App;
