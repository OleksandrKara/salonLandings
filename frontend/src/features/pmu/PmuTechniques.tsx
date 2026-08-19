import type { CSSProperties } from "react";
import { getPmuCatalog } from "@/api/pmu";
import { ErrorNotice } from "@/features/landing/ErrorNotice";
import { Spinner } from "@/features/landing/Spinner";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";
import { formatPrice } from "@/lib/formatting";
import { useAsync } from "@/lib/useAsync";
import type { PmuTechniqueOffer } from "@/types/pmu";

export function PmuTechniques() {
  const { status, data, error, retry } = useAsync(getPmuCatalog, []);
  const { openConsultation, openDeposit } = usePmuBookingModalContext();

  return (
    <section style={styles.section} id="techniques">
      <div style={styles.eyebrow}>Not Sure Which Technique Is Right?</div>
      <h2 style={styles.heading}>Talk It Through First — Free</h2>
      <p style={styles.lead}>
        Every brow is different. A free video consultation with our team is the easiest way to figure out which
        technique fits your face shape, skin type, and goals — before you spend a cent.
      </p>
      <button onClick={() => openConsultation()} style={styles.primaryButton}>
        Book a Free Online Consultation
      </button>
      <button onClick={() => openConsultation("in-person-consultation")} style={styles.secondaryButton}>
        Prefer to meet in person? Book an in-studio consultation — $50
      </button>

      {status === "loading" ? <Spinner label="Loading techniques…" /> : null}
      {status === "error" ? <ErrorNotice message={error ?? "Something went wrong."} onRetry={retry} /> : null}
      {status === "success" && data ? (
        <div style={styles.divider}>
          <div style={styles.dividerLabel}>Already know what you want?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {data.techniques.map((technique) => (
              <TechniqueCard key={technique.slug} technique={technique} depositAmount={data.deposit_amount} onBook={() => openDeposit(technique.slug)} />
            ))}
          </div>
          <p style={styles.depositNote}>
            Reserve your date with a ${data.deposit_amount.toFixed(0)} deposit now — the remaining balance is due at
            your appointment. Fully refundable with 48 hours' notice.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function TechniqueCard({
  technique,
  depositAmount,
  onBook,
}: {
  technique: PmuTechniqueOffer;
  depositAmount: number;
  onBook: () => void;
}) {
  return (
    <div style={styles.card}>
      <div style={{ flex: 1 }}>
        <div style={styles.cardName}>{technique.name}</div>
        <p style={styles.cardDescription}>{technique.description}</p>
        <div style={styles.cardMeta}>{technique.duration_minutes} min</div>
      </div>
      <div style={styles.cardPriceCol}>
        <div style={styles.cardPrice}>{formatPrice(technique.price)}</div>
        <button onClick={onBook} style={styles.cardButton}>
          Reserve — ${depositAmount.toFixed(0)} deposit
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "38px 22px 8px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 },
  heading: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "8px 0 0", color: "var(--color-ink)" },
  lead: { fontSize: 14.5, lineHeight: 1.55, color: "var(--color-muted)", margin: "10px 0 0" },
  primaryButton: {
    width: "100%",
    marginTop: 18,
    border: "none",
    background: "var(--color-accent)",
    color: "#fff7f3",
    fontSize: 15.5,
    fontWeight: 600,
    letterSpacing: 0.3,
    padding: 16,
    borderRadius: 12,
    cursor: "pointer",
  },
  secondaryButton: {
    display: "block",
    width: "100%",
    marginTop: 10,
    border: "1px solid var(--color-accent-border-soft)",
    background: "var(--color-accent-tint-2)",
    color: "var(--color-accent)",
    fontSize: 13,
    fontWeight: 600,
    padding: 13,
    borderRadius: 11,
    cursor: "pointer",
  },
  divider: { marginTop: 30, paddingTop: 22, borderTop: "1px solid var(--color-border)" },
  dividerLabel: { fontSize: 12.5, fontWeight: 600, color: "var(--color-muted-2)", textAlign: "center" },
  card: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    padding: "16px 17px",
    border: "1px solid var(--color-border-2)",
    borderRadius: 14,
    background: "var(--color-card)",
  },
  cardName: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, color: "var(--color-ink)" },
  cardDescription: { fontSize: 12.5, lineHeight: 1.45, color: "var(--color-muted)", margin: "5px 0 0" },
  cardMeta: { fontSize: 11.5, color: "var(--color-muted-3)", marginTop: 8 },
  cardPriceCol: { flex: "none", textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
  cardPrice: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--color-ink)" },
  cardButton: {
    border: "1px solid var(--color-accent)",
    background: "transparent",
    color: "var(--color-accent)",
    fontSize: 11.5,
    fontWeight: 600,
    padding: "8px 10px",
    borderRadius: 9,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  depositNote: { fontSize: 11.5, color: "var(--color-muted-3)", textAlign: "center", marginTop: 14, lineHeight: 1.5 },
};
