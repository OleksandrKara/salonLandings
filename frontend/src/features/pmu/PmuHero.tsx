import type { CSSProperties } from "react";
import { GoogleLogo } from "@/features/landing/GoogleLogo";
import { PMU_RATING } from "@/data/pmuCopy";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";
import type { LandingVariantContent } from "@/types/api";

// Served from public/ (not a src/assets/pmu/ import) so its URL is stable across builds —
// index.html's inline head script preloads this exact path for pmu-annakara.com visitors (see
// that script's own comment for why it can't just be a static <link>, the way mani's hero is
// preloaded, since this one build serves both businesses). Matches mani's identical fix
// (2026-09-04) for the identical problem: an imported hero image only exists inside the JS
// bundle, so the browser couldn't start fetching it until the bundle downloaded/parsed/executed
// all the way to this component's render — worse here, since this file is 148KB, the largest
// hero-class image across all three businesses this SPA serves.
const DEFAULT_HERO_IMAGE = "/pmu-hero-default.jpg";

export function PmuHero({ overrides }: { overrides?: LandingVariantContent }) {
  const { openConsultation } = usePmuBookingModalContext();

  return (
    <section style={styles.section}>
      <div style={styles.imageWrap}>
        <img
          src={overrides?.heroImageUrl ?? DEFAULT_HERO_IMAGE}
          alt="Close-up of hand-drawn hairstroke brow tattooing"
          style={styles.image}
          fetchPriority="high"
        />
        <div style={styles.imageGradient} />
        <div style={styles.ratingBadge}>
          <GoogleLogo size={20} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)" }}>{PMU_RATING.score}</span>
          <span style={{ color: "var(--color-gold)", fontSize: 13, letterSpacing: 1 }}>★★★★★</span>
          <span style={{ fontSize: 12, color: "var(--color-muted-2)", fontWeight: 500 }}>{PMU_RATING.count} reviews</span>
        </div>
      </div>

      <div style={styles.eyebrow}>San Diego · Brow Studio</div>
      <h1 style={styles.headline}>{overrides?.heroHeadline ?? "Wake Up With Perfect Brows, Every Day"}</h1>
      <p style={styles.subhead}>
        Anna Kara's team of skilled brow artists — hand-drawn, realistic hairstroke and combo techniques made to fit
        your natural shape. Start with a free conversation about your goals, no commitment required.
      </p>

      <button onClick={() => openConsultation()} style={styles.primaryButton}>
        Book a Free Online Consultation
      </button>
      <p style={styles.microcopy}>15 minutes · Video call · No cost, no commitment</p>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "22px 22px 8px" },
  imageWrap: { position: "relative", borderRadius: 18, overflow: "hidden" },
  image: { display: "block", width: "100%", height: "420px", objectFit: "cover", objectPosition: "50% 40%" },
  imageGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "56%", background: "linear-gradient(to top, rgba(38,24,20,0.68), rgba(38,24,20,0))", pointerEvents: "none" },
  ratingBadge: { position: "absolute", left: 12, bottom: 12, display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.96)", borderRadius: 11, padding: "8px 11px", boxShadow: "0 4px 14px rgba(38,24,20,0.28)" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, marginTop: 20 },
  headline: {
    fontFamily: "var(--font-heading)",
    fontWeight: 600,
    fontSize: "clamp(32px, 8.5vw, 44px)",
    lineHeight: 1.08,
    margin: "12px 0 0",
    letterSpacing: -0.2,
  },
  subhead: { fontSize: 16, lineHeight: 1.5, color: "var(--color-muted)", margin: "14px 0 0" },
  primaryButton: {
    width: "100%",
    marginTop: 22,
    border: "none",
    background: "var(--color-accent)",
    color: "#fff7f3",
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.3,
    padding: 17,
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(158,90,99,0.28)",
  },
  microcopy: { textAlign: "center", fontSize: 12.5, color: "var(--color-muted-2)", marginTop: 9 },
};
