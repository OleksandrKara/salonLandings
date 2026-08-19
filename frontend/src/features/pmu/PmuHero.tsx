import type { CSSProperties } from "react";
import { GoogleLogo } from "@/features/landing/GoogleLogo";
import { PMU_RATING } from "@/data/pmuCopy";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";

export function PmuHero() {
  const { openConsultation } = usePmuBookingModalContext();

  return (
    <section style={styles.section}>
      <div style={styles.ratingBadge}>
        <GoogleLogo size={20} />
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)" }}>{PMU_RATING.score}</span>
        <span style={{ color: "var(--color-gold)", fontSize: 13, letterSpacing: 1 }}>★★★★★</span>
        <span style={{ fontSize: 12, color: "var(--color-muted-2)", fontWeight: 500 }}>{PMU_RATING.count} reviews</span>
      </div>

      <div style={styles.eyebrow}>San Diego · Brow Specialist</div>
      <h1 style={styles.headline}>Wake Up With Perfect Brows, Every Day</h1>
      <p style={styles.subhead}>
        Anna Kara's signature hairstroke and combo techniques — hand-drawn, realistic, and made to fit your natural
        shape. Start with a free conversation about your goals, no commitment required.
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
  ratingBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 11,
    padding: "8px 11px",
    marginBottom: 16,
  },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 },
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
