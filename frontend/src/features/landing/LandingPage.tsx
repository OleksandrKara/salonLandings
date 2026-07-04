import type { CSSProperties } from "react";
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

export function LandingPage() {
  return (
    <CartMenuProvider>
      <BookingModalProvider>
        <div style={styles.page}>
          <Header />
          <Hero />
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
