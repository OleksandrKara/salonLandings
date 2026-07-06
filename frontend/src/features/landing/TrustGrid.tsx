import type { CSSProperties } from "react";
import { TRUST_POINTS, terminologize } from "@/data/designCopy";
import type { LandingVariantContent } from "@/types/api";

export function TrustGrid({ terminology }: { terminology?: LandingVariantContent["terminology"] }) {
  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>Why It's Different</div>
      <div style={styles.grid}>
        {TRUST_POINTS.map((point) => (
          <div key={point.no} style={styles.cell}>
            <div style={styles.number}>{point.no}</div>
            <div style={styles.title}>{terminologize(point.title, terminology)}</div>
            <div style={styles.desc}>{point.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "40px 22px 8px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, marginBottom: 18 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--color-border)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" },
  cell: { background: "var(--color-card)", padding: "18px 15px" },
  number: { fontFamily: "var(--font-heading)", fontSize: 15, color: "#c8a39a", fontWeight: 600 },
  title: { fontWeight: 600, fontSize: 15, marginTop: 8, color: "var(--color-ink)", lineHeight: 1.25 },
  desc: { fontSize: 13, color: "var(--color-muted-2)", marginTop: 6, lineHeight: 1.4 },
};
