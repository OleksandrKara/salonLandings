import { useEffect, type CSSProperties } from "react";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";
import { useCartMenu } from "@/features/landing/CartMenuContext";
import { ErrorNotice } from "@/features/landing/ErrorNotice";
import { Footer } from "@/features/landing/Footer";
import { GoogleLogo } from "@/features/landing/GoogleLogo";
import { GoogleReviews } from "@/features/landing/GoogleReviews";
import { Header } from "@/features/landing/Header";
import { Spinner } from "@/features/landing/Spinner";
import { CAROUSEL_SLIDES, GOOGLE_REVIEW_COUNT, GOOGLE_REVIEW_RATING, TRUST_POINTS, terminologize } from "@/data/designCopy";
import { formatPrice } from "@/lib/formatting";
import type { LandingVariantContent } from "@/types/api";

/** "Precision Studio" — one of the 2 new A/B design variants (content.template === "precision").
 * Leans into the hygiene/precision-technique trust angle that actually drives "Russian manicure"
 * searches, instead of the classic template's soft/romantic positioning. Renders inside the exact
 * same CartMenuProvider/BookingModalProvider/StickyBottomBar/BookingModal LandingPage.tsx already
 * sets up for every variant — this component only supplies different marketing-content JSX, never
 * touches the booking funnel itself. The booking modal is opened automatically on mount (see the
 * effect below) since this variant's whole premise is "skip the tap, land straight on services".
 */
export function ManiPrecisionTemplate({ overrides }: { overrides: LandingVariantContent }) {
  const { open } = useBookingModalContext();
  const { status, cartMenu, error, retry } = useCartMenu();

  // Auto-open once on mount — position="end" (set on this variant's own content, same field
  // Version_7 uses) already makes step 1 "services", so open() with zero extra plumbing already
  // lands exactly where the "skip the hero, go straight to service selection" ask wants.
  useEffect(() => {
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gridPhotos = CAROUSEL_SLIDES.slice(0, 6);
  const top = cartMenu ? (cartMenu.manicure.pricing.find((p) => p.tier === "top") ?? cartMenu.manicure.pricing[0]) : null;

  return (
    <div style={styles.page}>
      <Header />

      <section style={styles.hero}>
        <div style={styles.eyebrow}>Precision · Hygiene · Longevity</div>
        <h1 style={styles.headline}>
          {overrides.heroHeadline ?? "Russian Manicure, Done With Surgical Precision"}
        </h1>
        <p style={styles.subhead}>
          {overrides.heroSubheadline ??
            "Sterilized tools. Single-use bits. Dry e-file cuticle work that holds a clean line for up to 4 weeks — no soaking, no shortcuts."}
        </p>

        {status === "loading" ? <Spinner label="Loading pricing…" /> : null}
        {status === "error" ? <ErrorNotice message={error ?? "Something went wrong."} onRetry={retry} /> : null}
        {status === "success" && top ? (
          <div style={styles.priceRow}>
            <span style={styles.priceLabel}>First visit</span>
            {top.compare_at_price ? <span style={styles.priceOld}>{formatPrice(top.compare_at_price)}</span> : null}
            <span style={styles.priceNew}>{formatPrice(top.price)}</span>
          </div>
        ) : null}

        <button onClick={open} style={styles.primaryButton}>
          {overrides.ctaText ?? "Select Your Service"}
        </button>
      </section>

      <section style={styles.specSection}>
        <div style={styles.eyebrowDark}>Spec Sheet</div>
        <div style={styles.specGrid}>
          {TRUST_POINTS.map((point) => (
            <div key={point.no} style={styles.specCell}>
              <div style={styles.specNo}>{point.no}</div>
              <div style={styles.specTitle}>{terminologize(point.title, overrides.terminology)}</div>
              <div style={styles.specDesc}>{point.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.gallerySection}>
        <div style={styles.eyebrowDark}>The Work, Up Close</div>
        <div style={styles.photoGrid}>
          {gridPhotos.map((slide) => (
            <div key={slide.id} style={styles.photoCell}>
              <img src={slide.src} alt={slide.caption} style={styles.photoImg} loading="lazy" />
              <div style={styles.photoCaption}>{slide.caption}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.ratingStrip}>
        <GoogleLogo size={22} />
        <span style={styles.ratingValue}>{GOOGLE_REVIEW_RATING}</span>
        <span style={styles.ratingStars}>★★★★★</span>
        <span style={styles.ratingCount}>{GOOGLE_REVIEW_COUNT} Google reviews</span>
      </section>

      <GoogleReviews terminology={overrides.terminology} />

      <section style={styles.finalCta}>
        <h2 style={styles.finalCtaTitle}>Book your slot in under a minute.</h2>
        <p style={styles.finalCtaSubtitle}>No prepayment. No account. Just pick a time.</p>
        <button onClick={open} style={styles.primaryButton}>
          {overrides.ctaText ?? "Select Your Service"}
        </button>
      </section>

      <Footer terminology={overrides.terminology} />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: "var(--max-width)",
    margin: "0 auto",
    background: "var(--color-bg-from)",
    minHeight: "100vh",
    paddingBottom: 96,
  },
  hero: { padding: "28px 22px 20px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.6, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 700 },
  headline: {
    fontFamily: "var(--font-heading)",
    fontWeight: 800,
    fontSize: "clamp(32px, 8.6vw, 42px)",
    lineHeight: 1.06,
    letterSpacing: -0.3,
    margin: "14px 0 0",
    color: "var(--color-ink)",
  },
  subhead: { fontSize: 15.5, lineHeight: 1.55, color: "var(--color-muted)", margin: "14px 0 0" },
  priceRow: { display: "flex", alignItems: "baseline", gap: 10, marginTop: 20, padding: "12px 16px", background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10 },
  priceLabel: { fontSize: 12, color: "var(--color-muted-2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  priceOld: { fontSize: 14, color: "var(--color-muted-3)", textDecoration: "line-through", fontVariantNumeric: "tabular-nums" },
  priceNew: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, color: "var(--color-ink)", fontVariantNumeric: "tabular-nums" },
  primaryButton: {
    width: "100%",
    marginTop: 18,
    border: "none",
    background: "var(--color-accent)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.2,
    padding: 17,
    borderRadius: 4,
    cursor: "pointer",
  },
  specSection: { padding: "8px 22px 0" },
  eyebrowDark: { fontSize: 11.5, letterSpacing: 2.6, textTransform: "uppercase", color: "var(--color-muted-2)", fontWeight: 700, margin: "28px 0 14px" },
  specGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)" },
  specCell: { padding: "16px 14px", borderRight: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", background: "var(--color-card)" },
  specNo: { fontFamily: "var(--font-heading)", fontSize: 13, color: "var(--color-accent)", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  specTitle: { fontWeight: 700, fontSize: 14, marginTop: 8, color: "var(--color-ink)", lineHeight: 1.25 },
  specDesc: { fontSize: 12.5, color: "var(--color-muted-2)", marginTop: 6, lineHeight: 1.4 },
  gallerySection: { padding: "8px 22px 0" },
  photoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 },
  photoCell: { position: "relative", aspectRatio: "1 / 1", overflow: "hidden", background: "var(--color-card)" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  photoCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "6px 8px",
    fontSize: 10.5,
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(to top, rgba(21,23,22,0.75), rgba(21,23,22,0))",
  },
  ratingStrip: { display: "flex", alignItems: "center", gap: 8, padding: "22px 22px 0" },
  ratingValue: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "var(--color-ink)" },
  ratingStars: { color: "var(--color-gold)", fontSize: 13, letterSpacing: 1 },
  ratingCount: { fontSize: 12.5, color: "var(--color-muted-2)" },
  finalCta: { padding: "40px 22px 8px", textAlign: "center" },
  finalCtaTitle: { fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 24, color: "var(--color-ink)", margin: 0 },
  finalCtaSubtitle: { fontSize: 14, color: "var(--color-muted)", margin: "8px 0 0" },
};
