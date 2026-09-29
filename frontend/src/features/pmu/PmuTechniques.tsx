import type { CSSProperties } from "react";
import { getPmuCatalog } from "@/api/pmu";
import { ErrorNotice } from "@/features/landing/ErrorNotice";
import { Spinner } from "@/features/landing/Spinner";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";
import { formatPrice } from "@/lib/formatting";
import { useAsync } from "@/lib/useAsync";
import type { PmuConsultationOffer } from "@/types/pmu";

// Owner request 2026-09-29: this page offers only the two consultation types, no procedure list.
// Techniques are still bookable by direct link (PmuDeepLinkOpener: ?technique=..., used by the
// touch-up / color-booster reminder emails); they're just no longer listed here.
//
// Card copy restates the owner's own Square item descriptions ("Consultation" and "Online
// Consultation"), including "the $50 consultation fee is applied toward the cost of your future
// procedure". Price and length are read live from Square. Nothing about refunds on purpose: the
// owner's descriptions don't say, so don't add a refund claim until the owner confirms the policy.
const CARD_COPY: Record<string, { title: string; where: string; points: string[]; cta: string }> = {
  "online-consultation": {
    title: "Online Consultation",
    where: "FaceTime or phone call",
    points: [
      "Get to know your artist",
      "Ask your questions about the procedure",
      "Find out which technique, shape, and color may fit you",
      "Discuss existing permanent makeup",
    ],
    cta: "Book Free Online Consultation",
  },
  "in-person-consultation": {
    title: "In-Studio Consultation",
    where: "In person, at the studio",
    points: [
      "Your artist sees your brows and skin in person",
      "Choose your shape, technique, and pigment color together",
      "Talk through healing, aftercare, and contraindications",
    ],
    cta: "Book In-Studio Consultation",
  },
};

export function PmuTechniques() {
  const { status, data, error, retry } = useAsync(getPmuCatalog, []);
  const { openConsultation } = usePmuBookingModalContext();
  const consultations = (data?.consultations ?? []).filter((c) => CARD_COPY[c.slug]);

  return (
    <section style={styles.section} id="techniques">
      <div style={styles.eyebrow}>Start With a Consultation</div>
      <h2 style={styles.heading}>Two Ways to Meet Your Artist</h2>
      <p style={styles.lead}>
        Every brow is different. Before any procedure, we talk it through with you, online for free or in person at
        the studio.
      </p>

      {status === "loading" ? <Spinner label="Loading…" /> : null}
      {status === "error" ? <ErrorNotice message={error ?? "Something went wrong."} onRetry={retry} /> : null}
      {status === "success" ? (
        <div style={styles.options}>
          {consultations.map((c) => (
            <ConsultationCard key={c.slug} offer={c} onBook={() => openConsultation(c.slug)} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ConsultationCard({ offer, onBook }: { offer: PmuConsultationOffer; onBook: () => void }) {
  const copy = CARD_COPY[offer.slug];
  const isFree = offer.price === 0;
  return (
    <div style={isFree ? styles.card : { ...styles.card, ...styles.cardPaid }}>
      <div style={styles.cardTop}>
        <div style={styles.cardName}>{copy.title}</div>
        <div style={styles.cardPrice}>{isFree ? "Free" : formatPrice(offer.price)}</div>
      </div>
      <div style={styles.cardMeta}>
        {offer.duration_minutes} min · {copy.where}
      </div>
      <ul style={styles.points}>
        {copy.points.map((p) => (
          <li key={p} style={styles.point}>
            <span style={styles.check} aria-hidden>
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>
      {!isFree ? (
        <div style={styles.credit}>
          The {formatPrice(offer.price)} fee goes toward the cost of your procedure when you book it with us.
        </div>
      ) : null}
      <button onClick={onBook} style={isFree ? styles.primaryButton : styles.secondaryButton}>
        {copy.cta}
      </button>
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
  options: { display: "flex", flexDirection: "column", gap: 14, marginTop: 22 },
  card: {
    padding: "18px 18px 16px",
    border: "1px solid var(--color-border-2)",
    borderRadius: 16,
    background: "var(--color-card)",
  },
  cardPaid: { background: "var(--color-accent-tint-2)", borderColor: "var(--color-accent-border-soft)" },
  cardTop: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  cardName: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 19, color: "var(--color-ink)" },
  cardPrice: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 21, color: "var(--color-accent)", flex: "none" },
  cardMeta: { fontSize: 12.5, color: "var(--color-muted-2)", marginTop: 4 },
  points: { listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 7 },
  point: { display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.45, color: "var(--color-muted)" },
  check: { color: "var(--color-accent)", fontWeight: 700, flex: "none" },
  credit: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 10,
    background: "var(--color-card)",
    border: "1px dashed var(--color-accent-border-soft)",
    fontSize: 13,
    lineHeight: 1.45,
    color: "var(--color-ink)",
    fontWeight: 600,
  },
};
