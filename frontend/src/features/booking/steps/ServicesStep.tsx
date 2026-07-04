import type { CSSProperties } from "react";
import { estimatedTotal } from "@/features/booking/useBookingModal";
import { BookingModalState } from "@/features/booking/types";
import { formatPrice } from "@/lib/formatting";
import type { CartMenu } from "@/types/api";

interface ServicesStepProps {
  cartMenu: CartMenu;
  state: BookingModalState;
  stepLabel: string;
  onToggleMani: () => void;
  onTogglePedicure: () => void;
  onToggleDesign: () => void;
  onToggleFourHand: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ServicesStep({
  cartMenu,
  state,
  stepLabel,
  onToggleMani,
  onTogglePedicure,
  onToggleDesign,
  onToggleFourHand,
  onContinue,
  onBack,
}: ServicesStepProps) {
  const { manicure, pedicure, design_addon: design } = cartMenu;
  const maniTop = manicure.pricing.find((p) => p.tier === "top") ?? manicure.pricing[0];
  const pediTop = pedicure.pricing.find((p) => p.tier === "top") ?? pedicure.pricing[0];

  const maniLast = state.maniSelected && !state.pedicureSelected;
  const pediLast = state.pedicureSelected && !state.maniSelected;
  const anySelected = state.fourHandSelected || state.maniSelected || state.pedicureSelected;
  const total = estimatedTotal(state, cartMenu);

  return (
    <div>
      <div style={styles.stepLabel}>{stepLabel}</div>
      <h3 style={styles.title}>Customize your visit</h3>
      <p style={styles.subtitle}>Choose your services — keep the signature manicure, add extras, or swap it out.</p>

      <div
        style={{
          ...styles.maniCard,
          borderColor: state.maniSelected ? "#e0b8b0" : "var(--color-border-3)",
          background: state.maniSelected ? "#faf3ef" : "#fff",
        }}
      >
        <div
          onClick={onToggleMani}
          style={{ ...styles.row, cursor: maniLast ? "default" : "pointer", padding: 14 }}
        >
          <Checkbox checked={state.maniSelected} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.itemName}>{manicure.name}</span>
            <span style={styles.noAcrylicBadge}>✦ No acrylic — nail-safe</span>
          </span>
          <span style={{ flex: "none", textAlign: "right", lineHeight: 1.1 }}>
            <span style={styles.strikePrice}>{formatPrice(maniTop.compare_at_price ?? maniTop.price)}</span>
            <span style={styles.itemPrice}>{formatPrice(maniTop.price)}</span>
            <span style={styles.discountLabel}>15% off · first visit</span>
          </span>
        </div>
        {state.maniSelected ? (
          <label onClick={onToggleDesign} style={styles.designRow}>
            <Checkbox checked={state.designSelected} small />
            <span style={{ flex: 1, fontSize: 13, color: "var(--color-ink-soft)" }}>
              Add <strong style={{ fontWeight: 600, color: "var(--color-ink)" }}>{design.name}</strong>
            </span>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-muted)" }}>
              +{formatPrice(design.price)}
            </span>
          </label>
        ) : null}
      </div>

      <label
        onClick={pediLast ? undefined : onTogglePedicure}
        style={{
          ...styles.row,
          padding: 14,
          border: `1px solid ${state.pedicureSelected ? "var(--color-accent)" : "var(--color-border-3)"}`,
          borderRadius: 12,
          background: state.pedicureSelected ? "var(--color-accent-tint-2)" : "#fff",
          marginBottom: 10,
          cursor: pediLast ? "default" : "pointer",
        }}
      >
        <Checkbox checked={state.pedicureSelected} />
        <span style={{ flex: 1 }}>
          <span style={styles.itemName}>{pedicure.name}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--color-muted-2)" }}>
            {pedicure.description}
          </span>
        </span>
        <span style={{ flex: "none", textAlign: "right", lineHeight: 1.1 }}>
          <span style={styles.strikePrice}>{formatPrice(pediTop.compare_at_price ?? pediTop.price)}</span>
          <span style={styles.itemPrice}>{formatPrice(pediTop.price)}</span>
          <span style={styles.discountLabel}>15% off · first visit</span>
        </span>
      </label>

      <div style={styles.sectionLabel}>Short on time?</div>
      <label
        onClick={onToggleFourHand}
        style={{
          ...styles.fourHandCard,
          borderColor: state.fourHandSelected ? "var(--color-accent)" : "#e0b8b0",
          background: state.fourHandSelected ? "#f1ddd7" : "#fbf3ef",
        }}
      >
        <div style={styles.row}>
          <Checkbox checked={state.fourHandSelected} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.itemName}>{cartMenu.four_hand_request.name}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--color-muted-2)", lineHeight: 1.4 }}>
              Two nail techs work at once — get mani + pedi together, or finish twice as fast.
            </span>
          </span>
          <span style={styles.byRequestBadge}>By request</span>
        </div>
        {state.fourHandSelected ? (
          <span style={{ display: "block", fontSize: 11.5, color: "var(--color-accent)", marginTop: 10, lineHeight: 1.4 }}>
            📞 Selected — we'll call you to schedule the date, time &amp; final pricing.
          </span>
        ) : null}
      </label>

      {!state.fourHandSelected ? (
        <div style={styles.totalRow}>
          <span style={{ fontSize: 14, color: "var(--color-muted)" }}>Estimated total</span>
          <span style={styles.totalPrice}>{formatPrice(total)}</span>
        </div>
      ) : null}

      <button
        onClick={onContinue}
        disabled={!anySelected}
        style={{ ...styles.continueButton, background: anySelected ? "var(--color-accent)" : "#d8bfb8" }}
      >
        Continue
      </button>
      {!anySelected ? (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-danger)", marginTop: 8 }}>
          Select at least one service to continue.
        </div>
      ) : null}
      <button onClick={onBack} style={styles.backButton}>
        Back
      </button>
    </div>
  );
}

function Checkbox({ checked, small = false }: { checked: boolean; small?: boolean }) {
  const size = small ? 19 : 22;
  return (
    <span
      style={{
        flex: "none",
        width: size,
        height: size,
        borderRadius: 6,
        border: `2px solid ${checked ? "var(--color-accent)" : "#c9b3aa"}`,
        background: checked ? "var(--color-accent)" : "#fff",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: small ? 12 : 14,
      }}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

const styles: Record<string, CSSProperties> = {
  stepLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, marginTop: 6 },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "6px 0 4px" },
  subtitle: { fontSize: 13.5, color: "var(--color-muted-2)", margin: "0 0 16px" },
  maniCard: { border: "1.5px solid", borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  row: { display: "flex", alignItems: "center", gap: 12 },
  itemName: { display: "block", fontWeight: 600, fontSize: 14.5, color: "var(--color-ink)" },
  noAcrylicBadge: {
    display: "inline-block",
    marginTop: 5,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "var(--color-accent)",
    background: "var(--color-accent-tint)",
    padding: "3px 8px",
    borderRadius: 20,
  },
  strikePrice: { display: "block", fontSize: 12, color: "var(--color-muted-3)", textDecoration: "line-through" },
  itemPrice: { display: "block", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--color-accent)" },
  discountLabel: { display: "block", fontSize: 9.5, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--color-accent)" },
  designRow: { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px 13px 48px", borderTop: "1px dashed #e2cfc5", cursor: "pointer" },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, margin: "18px 2px 8px" },
  fourHandCard: { display: "block", padding: "15px 16px", border: "1.5px solid", borderRadius: 12, marginBottom: 6, cursor: "pointer" },
  byRequestBadge: {
    flex: "none",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "var(--color-accent)",
    background: "var(--color-accent-tint)",
    padding: "4px 9px",
    borderRadius: 20,
    whiteSpace: "nowrap",
  },
  totalRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "18px 2px 14px" },
  totalPrice: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: "var(--color-ink)" },
  continueButton: { width: "100%", border: "none", color: "#fff7f3", fontSize: 16, fontWeight: 600, padding: 16, borderRadius: 12, cursor: "pointer" },
  backButton: { width: "100%", marginTop: 9, border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, padding: 8, cursor: "pointer" },
};
