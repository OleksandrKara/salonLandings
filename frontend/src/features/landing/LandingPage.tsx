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
import { recordVisit } from "@/lib/tracking";
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

  return (
    <CartMenuProvider>
      <BookingModalProvider>
        <div style={styles.page}>
          <Header />
          <Hero overrides={overrides} />
          <TrustGrid />
          <ResultsCarousel />
          <WhyClientsStay />
          <GoogleReviews />
          <LocationSection />
          <BookingCtaBanner />
          <FinalUrgencyCta />
          <Footer />
        </div>
        <StickyBottomBar />
        <BookingModal />
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
