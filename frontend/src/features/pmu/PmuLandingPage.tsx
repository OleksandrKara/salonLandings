import { useEffect, type CSSProperties } from "react";
import { PmuBookingModal } from "@/features/pmu/PmuBookingModal";
import { PmuBookingModalProvider } from "@/features/pmu/PmuBookingModalContext";
import { PmuFooter } from "@/features/pmu/PmuFooter";
import { PmuHeader } from "@/features/pmu/PmuHeader";
import { PmuHero } from "@/features/pmu/PmuHero";
import { PmuReviews } from "@/features/pmu/PmuReviews";
import { PmuTechniques } from "@/features/pmu/PmuTechniques";
import { recordVisit } from "@/lib/tracking";

export function PmuLandingPage() {
  useEffect(() => {
    recordVisit();
  }, []);

  return (
    <PmuBookingModalProvider>
      <div style={styles.page}>
        <PmuHeader />
        <PmuHero />
        <PmuTechniques />
        <PmuReviews />
        <PmuFooter />
      </div>
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
    paddingBottom: 40,
    overflow: "hidden",
  },
};
