import type { CSSProperties } from "react";
import { WHY_CLIENTS_STAY } from "@/data/designCopy";

export function WhyClientsStay() {
  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>Why Clients Stay</div>
      <div style={styles.list}>
        {WHY_CLIENTS_STAY.map((reason) => (
          <div key={reason} style={styles.row}>
            <span style={styles.bullet} />
            <span style={styles.text}>{reason}</span>
          </div>
        ))}
      </div>
      <div style={styles.onHouse}>
        <strong style={{ color: "var(--color-ink)", fontWeight: 600 }}>On the house.</strong> Enjoy complimentary
        coffee, tea, water &amp; sweets while your nails set.
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "44px 22px 8px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 },
  list: { display: "flex", flexDirection: "column", marginTop: 16 },
  row: { display: "flex", alignItems: "flex-start", gap: 13, padding: "15px 0", borderBottom: "1px solid #f0e4dc" },
  bullet: { flex: "none", width: 8, height: 8, borderRadius: 2, background: "var(--color-accent)", marginTop: 7 },
  text: { fontSize: 15.5, color: "var(--color-ink)", lineHeight: 1.35 },
  onHouse: { marginTop: 18, padding: 18, background: "var(--color-accent-tint-2)", borderRadius: 14, fontSize: 14, lineHeight: 1.5, color: "var(--color-muted)" },
};
