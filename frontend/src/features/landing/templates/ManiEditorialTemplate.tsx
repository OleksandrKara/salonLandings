import { useEffect, type CSSProperties } from "react";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";
import { useCartMenu } from "@/features/landing/CartMenuContext";
import { ErrorNotice } from "@/features/landing/ErrorNotice";
import { GoogleReviews } from "@/features/landing/GoogleReviews";
import { Spinner } from "@/features/landing/Spinner";
import { CAROUSEL_SLIDES, GOOGLE_REVIEW_COUNT, GOOGLE_REVIEW_RATING, LOCATION, TRUST_POINTS, terminologize } from "@/data/designCopy";
import { formatPrice } from "@/lib/formatting";
import type { LandingVariantContent } from "@/types/api";

/** "Editorial Gloss" — the other new A/B design variant (content.template === "editorial").
 * High-fashion beauty-editorial positioning: full-bleed macro photography, oversized display
 * type, near-black ground with a single saturated accent. Renders inside the exact same
 * CartMenuProvider/BookingModalProvider/StickyBottomBar/BookingModal LandingPage.tsx already sets
 * up for every variant — only the marketing content differs, the booking funnel is untouched.
 *
 * Does NOT reuse the shared Header/Footer components — both render the dark-ink-on-transparent
 * AK.LUX.NAILS logo, which disappears against this template's near-black background. A plain text
 * wordmark (set in the display face) reads better here anyway, closer to a magazine masthead.
 */
export function ManiEditorialTemplate({ overrides }: { overrides: LandingVariantContent }) {
  const { open } = useBookingModalContext();
  const { status, cartMenu, error, retry } = useCartMenu();

  useEffect(() => {
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heroPhoto = CAROUSEL_SLIDES[0];
  const galleryPhotos = CAROUSEL_SLIDES.slice(1, 5);
  const top = cartMenu ? (cartMenu.manicure.pricing.find((p) => p.tier === "top") ?? cartMenu.manicure.pricing[0]) : null;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.wordmark}>AK·LUX·NAILS</span>
        <button onClick={open} style={styles.headerButton}>Book</button>
      </header>

      <section style={styles.hero}>
        <img src={overrides.heroImageUrl ?? heroPhoto.src} alt={heroPhoto.caption} style={styles.heroImg} fetchPriority="high" />
        <div style={styles.heroScrim} />
        <div style={styles.heroCopy}>
          <div style={styles.eyebrow}>San Diego · Russian Manicure</div>
          <h1 style={styles.headline}>
            {overrides.heroHeadline ?? "Nails Worth\nthe Close-Up"}
          </h1>
        </div>
      </section>

      <section style={styles.subheadSection}>
        <p style={styles.subhead}>
          {overrides.heroSubheadline ?? "Precision hard-gel manicures that hold their line for up to 4 weeks. No acrylics, ever."}
        </p>

        {status === "loading" ? <Spinner label="Loading pricing…" /> : null}
        {status === "error" ? <ErrorNotice message={error ?? "Something went wrong."} onRetry={retry} /> : null}
        {status === "success" && top ? (
          <div style={styles.priceRow}>
            {top.compare_at_price ? <span style={styles.priceOld}>{formatPrice(top.compare_at_price)}</span> : null}
            <span style={styles.priceNew}>{formatPrice(top.price)}</span>
            <span style={styles.priceLabel}>first visit</span>
          </div>
        ) : null}

        <button onClick={open} style={styles.primaryButton}>
          {overrides.ctaText ?? "Book The Look"}
        </button>
      </section>

      <section style={styles.galleryGrid}>
        {galleryPhotos.map((slide) => (
          <img key={slide.id} src={slide.src} alt={slide.caption} style={styles.galleryImg} loading="lazy" />
        ))}
      </section>

      <section style={styles.trustSection}>
        {TRUST_POINTS.map((point) => (
          <div key={point.no} style={styles.trustRow}>
            <span style={styles.trustAccentBar} />
            <div>
              <div style={styles.trustTitle}>{terminologize(point.title, overrides.terminology)}</div>
              <div style={styles.trustDesc}>{point.desc}</div>
            </div>
          </div>
        ))}
      </section>

      <section style={styles.ratingStrip}>
        <span style={styles.ratingStars}>★★★★★</span>
        <span style={styles.ratingValue}>{GOOGLE_REVIEW_RATING} on Google</span>
        <span style={styles.ratingCount}>· {GOOGLE_REVIEW_COUNT} reviews</span>
      </section>

      <GoogleReviews terminology={overrides.terminology} />

      <section style={styles.finalCta}>
        <h2 style={styles.finalCtaTitle}>Your seat is one tap away.</h2>
        <button onClick={open} style={styles.primaryButton}>
          {overrides.ctaText ?? "Book The Look"}
        </button>
      </section>

      <footer style={styles.footer}>
        <span style={styles.wordmark}>AK·LUX·NAILS</span>
        <div style={{ marginTop: 8 }}>{LOCATION.address}</div>
        <div>Open 7 days a week · By appointment</div>
      </footer>
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
  header: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    background: "rgba(11,11,12,0.82)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid var(--color-border)",
  },
  wordmark: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, letterSpacing: 1.5, color: "var(--color-ink)" },
  headerButton: { border: "1px solid var(--color-accent)", background: "transparent", color: "var(--color-accent)", fontSize: 12.5, fontWeight: 700, letterSpacing: 0.4, padding: "9px 16px", borderRadius: 2, cursor: "pointer" },
  hero: { position: "relative", aspectRatio: "4 / 5" },
  heroImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  heroScrim: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,11,12,0.92) 10%, rgba(11,11,12,0.15) 55%, rgba(11,11,12,0.35) 100%)" },
  heroCopy: { position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 22px 24px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.8, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 700 },
  headline: {
    fontFamily: "var(--font-heading)",
    fontStyle: "italic",
    fontWeight: 700,
    fontSize: "clamp(38px, 11vw, 54px)",
    lineHeight: 1.0,
    letterSpacing: -0.5,
    margin: "10px 0 0",
    color: "#fafaf8",
    whiteSpace: "pre-line",
  },
  subheadSection: { padding: "22px 22px 0" },
  subhead: { fontSize: 15.5, lineHeight: 1.55, color: "var(--color-muted)", margin: 0 },
  priceRow: { display: "flex", alignItems: "baseline", gap: 10, marginTop: 18 },
  priceOld: { fontSize: 14, color: "var(--color-muted-3)", textDecoration: "line-through", fontVariantNumeric: "tabular-nums" },
  priceNew: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 26, color: "var(--color-ink)", fontVariantNumeric: "tabular-nums" },
  priceLabel: { fontSize: 12.5, color: "var(--color-muted-2)" },
  primaryButton: {
    width: "100%",
    marginTop: 18,
    border: "none",
    background: "var(--color-accent)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.3,
    padding: 17,
    borderRadius: 2,
    cursor: "pointer",
  },
  galleryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginTop: 26 },
  galleryImg: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" },
  trustSection: { padding: "30px 22px 0", display: "flex", flexDirection: "column", gap: 18 },
  trustRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  trustAccentBar: { flex: "none", width: 3, height: 34, background: "var(--color-accent)", marginTop: 2 },
  trustTitle: { fontWeight: 700, fontSize: 15, color: "var(--color-ink)" },
  trustDesc: { fontSize: 13, color: "var(--color-muted-2)", marginTop: 4, lineHeight: 1.4 },
  ratingStrip: { display: "flex", alignItems: "center", gap: 6, padding: "26px 22px 0" },
  ratingStars: { color: "var(--color-accent)", fontSize: 13, letterSpacing: 1 },
  ratingValue: { fontSize: 13, fontWeight: 700, color: "var(--color-ink)" },
  ratingCount: { fontSize: 12.5, color: "var(--color-muted-2)" },
  finalCta: { padding: "40px 22px 8px", textAlign: "center" },
  finalCtaTitle: { fontFamily: "var(--font-heading)", fontStyle: "italic", fontWeight: 700, fontSize: 26, color: "var(--color-ink)", margin: "0 0 4px" },
  footer: { padding: "34px 22px 40px", textAlign: "center", color: "var(--color-muted-2)", fontSize: 12.5, lineHeight: 1.7, borderTop: "1px solid var(--color-border)", marginTop: 20 },
};
