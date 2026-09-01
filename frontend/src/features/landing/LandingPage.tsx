import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
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

// Lazy: BookingModal is always mounted (it just stays visually closed until the "open" trigger
// fires) but isn't needed for the initial paint at all — shipping its code (plus the two variant
// templates below) in the same chunk that blocks first render was a real, measured contributor to
// mani.akluxnails.com's slow LCP (found live 2026-09-01), same fix already applied to
// akluxnails-home's own booking modal for the identical reason.
const BookingModal = lazy(() =>
  import("@/features/booking/BookingModal").then((m) => ({ default: m.BookingModal })),
);
// Only the "precision"/"editorial" A/B variants ever render these — most visitors get the classic
// layout below and never need either chunk at all.
const ManiPrecisionTemplate = lazy(() =>
  import("@/features/landing/templates/ManiPrecisionTemplate").then((m) => ({ default: m.ManiPrecisionTemplate })),
);
const ManiEditorialTemplate = lazy(() =>
  import("@/features/landing/templates/ManiEditorialTemplate").then((m) => ({ default: m.ManiEditorialTemplate })),
);

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

  // "precision"/"editorial" pick an entirely different marketing-content template (see
  // ManiPrecisionTemplate/ManiEditorialTemplate) instead of a content override on the classic
  // layout — both render inside this exact same CartMenuProvider/BookingModalProvider/
  // StickyBottomBar/BookingModal wrapper, so the booking funnel is byte-for-byte identical no
  // matter which template is showing. The theme class is applied on this outermost div (not just
  // around the content) so it also reaches StickyBottomBar/BookingModal, which render as its
  // siblings, not descendants of the content block — same reasoning as the accentColor effect
  // above, which writes to document.documentElement for the same reason.
  // "precision" deliberately has no theme class of its own — the owner asked for its layout to
  // keep Version_7's exact colors/fonts (the default :root tokens in tokens.css), so it falls
  // through to `undefined` here just like the classic template does.
  const themeClassName = overrides.template === "editorial" ? "mani-editorial-theme" : undefined;

  const content =
    overrides.template === "precision" ? (
      <Suspense fallback={null}>
        <ManiPrecisionTemplate overrides={overrides} />
      </Suspense>
    ) : overrides.template === "editorial" ? (
      <Suspense fallback={null}>
        <ManiEditorialTemplate overrides={overrides} />
      </Suspense>
    ) : (
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
    );

  return (
    <div className={themeClassName} style={themeClassName ? { minHeight: "100vh" } : undefined}>
      <CartMenuProvider>
        <BookingModalProvider
          position={overrides.contactStepPosition ?? "start"}
          defaultService={overrides.defaultService ?? "manicure"}
        >
          {content}
          <StickyBottomBar />
          <Suspense fallback={null}>
            <BookingModal terminology={overrides.terminology} position={overrides.contactStepPosition ?? "start"} />
          </Suspense>
        </BookingModalProvider>
      </CartMenuProvider>
    </div>
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
