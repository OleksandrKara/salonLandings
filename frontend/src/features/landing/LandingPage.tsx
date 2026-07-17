import { useEffect, useState, type CSSProperties } from "react";
import { BookingModal } from "@/features/booking/BookingModal";
import { BookingModalProvider } from "@/features/booking/BookingModalContext";
import { BookingCtaBanner, FinalUrgencyCta } from "@/features/landing/CtaBanners";
import { CartMenuProvider } from "@/features/landing/CartMenuContext";
import { Footer } from "@/features/landing/Footer";
import { GoogleReviews } from "@/features/landing/GoogleReviews";
import { Header } from "@/features/landing/Header";
import { Hero } from "@/features/landing/Hero";
import { LocationSection } from "@/features/landing/LocationSection";
import { ResultsCarousel } from "@/features/landing/ResultsCarousel";
import { StickyBottomBar } from "@/features/landing/StickyBottomBar";
import { TrustGrid } from "@/features/landing/TrustGrid";
import { WhyClientsStay } from "@/features/landing/WhyClientsStay";
import { resolveExperiment } from "@/lib/experiments";
import { terminologize } from "@/data/designCopy";
import { recordVisit } from "@/lib/tracking";
import { accentPaletteToCssVars, deriveAccentPalette } from "@/lib/theme";
import type { LandingVariantContent } from "@/types/api";

export function LandingPage() {
  const [overrides, setOverrides] = useState<LandingVariantContent>({});

  useEffect(() => {
    recordVisit();
    // Not gated on first paint (protects LCP) — the hardcoded default copy renders
    // immediately and briefly flashes to the assigned variant's copy once resolved.
    resolveExperiment("mani")
      .then(({ content }) => setOverrides(content))
      .catch(() => {
        // experiment resolution only — nothing to recover, nothing to surface to the visitor
      });
  }, []);

  // index.html's <title>/meta description are static HTML, so a terminology override can only
  // reach them via a runtime patch once the variant resolves — a brief flash of the default is
  // fine here (same tradeoff as the visible copy below), and this only ever changes what's
  // already the exact same wording, just relabeled.
  useEffect(() => {
    if (overrides.terminology !== "european") return;
    document.title = terminologize(document.title, "european");
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", terminologize(metaDescription.getAttribute("content") ?? "", "european"));
    }
  }, [overrides.terminology]);

  // Every component already reads its colors via var(--color-accent) etc. Setting these on the
  // document root (not just a wrapper div) is what makes a variant's color actually reach
  // StickyBottomBar and BookingModal too — both render as siblings of the page content, outside
  // any wrapper div's subtree, so a div-scoped override would never have cascaded to them.
  useEffect(() => {
    const root = document.documentElement.style;
    if (!overrides.accentColor) return;
    const palette = accentPaletteToCssVars(deriveAccentPalette(overrides.accentColor));
    for (const [prop, value] of Object.entries(palette)) root.setProperty(prop, value);
    return () => {
      for (const prop of Object.keys(palette)) root.removeProperty(prop);
    };
  }, [overrides.accentColor]);

  return (
    <CartMenuProvider>
      <BookingModalProvider position={overrides.contactStepPosition ?? "start"}>
        <div style={styles.page}>
          <Header />
          <Hero overrides={overrides} />
          <TrustGrid terminology={overrides.terminology} />
          <ResultsCarousel terminology={overrides.terminology} />
          <WhyClientsStay terminology={overrides.terminology} />
          <GoogleReviews terminology={overrides.terminology} />
          <LocationSection />
          <BookingCtaBanner />
          <FinalUrgencyCta terminology={overrides.terminology} />
          <Footer terminology={overrides.terminology} />
        </div>
        <StickyBottomBar />
        <BookingModal terminology={overrides.terminology} position={overrides.contactStepPosition ?? "start"} />
      </BookingModalProvider>
    </CartMenuProvider>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: "var(--max-width)",
    margin: "0 auto",
    background: "var(--color-card)",
    boxShadow: "0 0 80px rgba(90,50,40,0.10)",
    minHeight: "100vh",
    paddingBottom: 96,
    overflow: "hidden",
  },
};
