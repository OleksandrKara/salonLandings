import type { CSSProperties } from "react";
import { LOCATION } from "@/data/designCopy";

export function LocationSection() {
  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>Find Us</div>
      <h2 style={styles.title}>In the heart of Downtown</h2>
      <div style={styles.card}>
        <span style={{ fontSize: 22, flex: "none", marginTop: 1 }}>📍</span>
        <div style={{ flex: 1, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "var(--color-ink)" }}>{LOCATION.name}</div>
          <div style={{ fontSize: 14, color: "var(--color-muted)" }}>{LOCATION.address}</div>
          <div style={{ fontSize: 12.5, color: "var(--color-muted-2)", marginTop: 6 }}>{LOCATION.note}</div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "44px 22px 8px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 28, margin: "8px 0 16px", letterSpacing: -0.2 },
  card: { display: "flex", alignItems: "flex-start", gap: 13, padding: 18, border: "1px solid var(--color-border-2)", borderRadius: 14, background: "var(--color-card)" },
};
