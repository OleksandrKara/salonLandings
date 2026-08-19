import { useEffect, useState, type CSSProperties } from "react";
import { PmuBookingModal } from "@/features/pmu/PmuBookingModal";
import { PmuBookingModalProvider } from "@/features/pmu/PmuBookingModalContext";
import { PmuFooter } from "@/features/pmu/PmuFooter";
import { PmuHeader } from "@/features/pmu/PmuHeader";
import { PmuHero } from "@/features/pmu/PmuHero";
import { PmuResultsCarousel } from "@/features/pmu/PmuResultsCarousel";
import { PmuReviews } from "@/features/pmu/PmuReviews";
import { PmuStickyBottomBar } from "@/features/pmu/PmuStickyBottomBar";
import { PmuTechniques } from "@/features/pmu/PmuTechniques";
import { resolveExperiment } from "@/lib/experiments";
import { recordVisit } from "@/lib/tracking";
import type { LandingVariantContent } from "@/types/api";

const PAGE_TITLE = "Permanent Brows by Anna Kara | Anna Kara's Beauty PMU Studio";
const PAGE_DESCRIPTION =
  "Hand-drawn, realistic brow techniques by Anna Kara in San Diego. Start with a free online consultation — no cost, no commitment.";

export function PmuLandingPage() {
  const [overrides, setOverrides] = useState<LandingVariantContent>({});

  useEffect(() => {
    recordVisit();
    // Not gated on first paint (protects LCP) — the hardcoded default headline renders
    // immediately and briefly flashes to the assigned variant's copy once resolved. Also what
    // makes future visits/contacts/attribution tag themselves with the "pmu" landing_page_id —
    // see lib/tracking.ts's withVariantAssignment, which reads the assignment this persists.
    resolveExperiment("pmu")
      .then(({ content }) => setOverrides(content))
      .catch(() => {
        // experiment resolution only — nothing to recover, nothing to surface to the visitor
      });
  }, []);

  // index.html's <title>/meta description/OG tags are static and shared with mani's own build
  // (one bundle serves both domains, see App.tsx) — same runtime-patch approach LandingPage.tsx
  // already uses for its own terminology overrides, just applied unconditionally here since this
  // page is never mani's.
  useEffect(() => {
    document.title = PAGE_TITLE;
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', "content", PAGE_DESCRIPTION);
    setMeta('meta[property="og:title"]', "content", PAGE_TITLE);
    setMeta('meta[property="og:description"]', "content", PAGE_DESCRIPTION);
    setMeta('meta[property="og:url"]', "content", "https://book.pmu-annakara.com/");
    setMeta('meta[property="og:site_name"]', "content", "Anna Kara's Beauty PMU Studio");
    setMeta('meta[property="og:image"]', "content", "https://book.pmu-annakara.com/pmu-og-image.png");
    setMeta('meta[name="twitter:title"]', "content", PAGE_TITLE);
    setMeta('meta[name="twitter:description"]', "content", PAGE_DESCRIPTION);
    setMeta('meta[name="twitter:image"]', "content", "https://book.pmu-annakara.com/pmu-og-image.png");
  }, []);

  return (
    <PmuBookingModalProvider>
      <div style={styles.page}>
        <PmuHeader />
        <PmuHero overrides={overrides} />
        <PmuTechniques />
        <PmuResultsCarousel />
        <PmuReviews />
        <PmuFooter />
      </div>
      <PmuStickyBottomBar />
      <PmuBookingModal />
    </PmuBookingModalProvider>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: "var(--max-width)",
    margin: "0 auto",
    background: "var(--color-card)",
    boxShadow: "0 0 80px rgba(90,50,40,0.10)",
    minHeight: "100vh",
    paddingBottom: 118,
    overflow: "hidden",
  },
};
