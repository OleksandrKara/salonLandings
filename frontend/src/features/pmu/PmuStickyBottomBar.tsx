import type { CSSProperties } from "react";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";

export function PmuStickyBottomBar() {
  const { openConsultation } = usePmuBookingModalContext();

  return (
    <div style={styles.bar}>
      <div style={styles.row}>
        <div style={{ lineHeight: 1.15, minWidth: 0 }}>
          <div style={styles.badge}>Free</div>
          <div style={styles.label}>Online Consultation</div>
        </div>
        <button onClick={() => openConsultation()} style={styles.ctaButton}>
          Book Free Consultation
        </button>
      </div>
      <button onClick={() => openConsultation("in-person-consultation")} style={styles.secondaryButton}>
        Prefer in person? Book a studio consultation — $50
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  bar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 45,
    maxWidth: "var(--max-width)",
    margin: "0 auto",
    background: "rgba(255,253,251,0.94)",
    backdropFilter: "blur(12px)",
    borderTop: "1px solid var(--color-border)",
  },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "11px 16px 8px" },
  badge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--color-accent)",
    background: "var(--color-accent-tint)",
    padding: "2px 7px",
    borderRadius: 20,
    marginBottom: 3,
  },
  label: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--color-ink)", whiteSpace: "nowrap" },
  ctaButton: {
    flex: 1,
    border: "none",
    background: "var(--color-accent)",
    color: "#fff7f3",
    fontSize: 15,
    fontWeight: 600,
    padding: 14,
    borderRadius: 11,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(158,90,99,0.3)",
  },
  secondaryButton: {
    display: "block",
    width: "calc(100% - 32px)",
    margin: "0 16px 10px",
    border: "1px solid var(--color-accent-border-soft)",
    background: "var(--color-accent-tint-2)",
    color: "var(--color-accent)",
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 10px",
    borderRadius: 9,
    cursor: "pointer",
    textAlign: "center",
  },
};
