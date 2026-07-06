import type { CSSProperties } from "react";
import { terminologize } from "@/data/designCopy";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";
import type { LandingVariantContent } from "@/types/api";

export function BookingCtaBanner() {
  const { open } = useBookingModalContext();
  return (
    <section style={styles.section}>
      <div style={styles.darkCard}>
        <h2 style={styles.darkTitle}>Ready for flawless nails?</h2>
        <p style={styles.darkSubtitle}>Takes under 60 seconds. No prepayment required.</p>
        <button onClick={open} style={styles.darkButton}>
          Book Your Appointment
        </button>
      </div>
    </section>
  );
}

export function FinalUrgencyCta({ terminology }: { terminology?: LandingVariantContent["terminology"] }) {
  const { open } = useBookingModalContext();
  return (
    <section style={{ padding: "36px 22px 20px" }}>
      <div style={styles.urgencyCard}>
        <div style={styles.urgencyLabel}>⚡ Limited summer availability</div>
        <p style={styles.urgencyText}>
          Only a few first-visit slots left this week — San Diego books fast in high season.
        </p>
        <button onClick={open} style={styles.urgencyButton}>
          {terminologize("Book Russian Manicure Appointment", terminology)}
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "44px 22px 8px" },
  darkCard: { padding: "28px 22px", background: "var(--color-ink)", borderRadius: 18, textAlign: "center", color: "#f6ece6" },
  darkTitle: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 29, margin: "0 0 8px", lineHeight: 1.1 },
  darkSubtitle: { fontSize: 14, color: "#c9b7ac", margin: "0 0 18px" },
  darkButton: { width: "100%", border: "none", background: "var(--color-accent)", color: "#fff7f3", fontSize: 16, fontWeight: 600, padding: 17, borderRadius: 12, cursor: "pointer" },
  urgencyCard: { textAlign: "center", padding: 22, border: "1px dashed #cdaea6", borderRadius: 14, background: "#fbf3ef" },
  urgencyLabel: { fontSize: 13, fontWeight: 600, color: "var(--color-accent)", letterSpacing: 0.3 },
  urgencyText: { fontSize: 15, color: "var(--color-ink-soft)", margin: "9px 0 16px", lineHeight: 1.45 },
  urgencyButton: { width: "100%", border: "none", background: "var(--color-accent)", color: "#fff7f3", fontSize: 16, fontWeight: 600, padding: 16, borderRadius: 12, cursor: "pointer" },
};
