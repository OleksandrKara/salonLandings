import type { CSSProperties } from "react";
import { GUARANTEE_POINT, terminologize } from "@/data/designCopy";
import { estimatedTotal } from "@/features/booking/useBookingModal";
import { BookingModalState } from "@/features/booking/types";
import { StepProgress } from "@/features/booking/StepProgress";
import { formatPrice } from "@/lib/formatting";
import type { CartMenu, LandingVariantContent } from "@/types/api";

interface ServicesStepProps {
  cartMenu: CartMenu;
  state: BookingModalState;
  currentStep: number;
  totalSteps: number;
  terminology?: LandingVariantContent["terminology"];
  onToggleMani: () => void;
  onTogglePedicure: () => void;
  onToggleDesign: () => void;
  onToggleFourHand: () => void;
  onContinue: () => void;
  /** Only present when this step isn't first in the flow — no back button when there's nowhere
   * to go back to (e.g. the contact-last variant, where Services is step 1). */
  onBack?: () => void;
}

export function ServicesStep({
  cartMenu,
  state,
  currentStep,
  totalSteps,
  terminology,
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
      <StepProgress current={currentStep} total={totalSteps} />
      <h3 style={styles.title}>Customize your visit</h3>
      <p style={styles.subtitle}>Choose your services — keep the signature manicure, add extras, or swap it out.</p>
      <p style={styles.preselectHint}>✓ Manicure already selected below — tap Continue, or customize first.</p>

      <div
        style={{
          ...styles.maniCard,
          borderColor: state.maniSelected ? "var(--color-accent-border-soft)" : "var(--color-border-3)",
          background: state.maniSelected ? "var(--color-accent-tint-2)" : "#fff",
        }}
      >
        <div
          onClick={onToggleMani}
          style={{ ...styles.row, cursor: maniLast ? "default" : "pointer", padding: 14 }}
        >
          <Checkbox checked={state.maniSelected} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={styles.itemName}>{terminologize(manicure.name, terminology)}</span>
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
          <span style={styles.itemName}>{terminologize(pedicure.name, terminology)}</span>
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

      <div style={styles.orDivider}>
        <span style={styles.orDividerLine} />
        <span style={styles.orDividerText}>or</span>
        <span style={styles.orDividerLine} />
      </div>
      <div style={styles.sectionLabel}>Short on time?</div>
      <label
        onClick={onToggleFourHand}
        style={{
          ...styles.fourHandCard,
          borderColor: state.fourHandSelected ? "var(--color-accent)" : "var(--color-border-3)",
          background: state.fourHandSelected ? "var(--color-accent-tint)" : "#fdfaf8",
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
          {cartMenu.four_hand_request.price != null ? (
            <span style={{ flex: "none", textAlign: "right", lineHeight: 1.1 }}>
              {cartMenu.four_hand_request.compare_at_price != null && (
                <span style={styles.strikePrice}>{formatPrice(cartMenu.four_hand_request.compare_at_price)}</span>
              )}
              <span style={styles.itemPrice}>{formatPrice(cartMenu.four_hand_request.price)}</span>
              {cartMenu.four_hand_request.compare_at_price != null && (
                <span style={styles.discountLabel}>15% off</span>
              )}
            </span>
          ) : (
            <span style={styles.byRequestBadge}>By request</span>
          )}
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
      <div style={styles.guarantee}>
        <span aria-hidden="true">🛡️</span> {GUARANTEE_POINT.title} — {GUARANTEE_POINT.desc}
      </div>

      <button
        onClick={onContinue}
        disabled={!anySelected}
        style={{ ...styles.continueButton, background: anySelected ? "var(--color-accent)" : "var(--color-accent-border-soft)" }}
      >
        Continue
      </button>
      {!anySelected ? (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-danger)", marginTop: 8 }}>
          Select at least one service to continue.
        </div>
      ) : null}
      {onBack ? (
        <button onClick={onBack} style={styles.backButton}>
          Back
        </button>
      ) : null}
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
        border: `2px solid ${checked ? "var(--color-accent)" : "var(--color-accent-border-soft)"}`,
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
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "6px 0 4px" },
  subtitle: { fontSize: 13.5, color: "var(--color-muted-2)", margin: "0 0 6px" },
  preselectHint: { fontSize: 12, fontWeight: 600, color: "var(--color-accent)", margin: "0 0 16px" },
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
  // A visual break before the 4-Hand section — it's a distinct, call-to-schedule product (see
  // ConfirmStep's callNotice), not a third peer option alongside the simple mani/pedi checkboxes,
  // so it reads as "an alternative path" rather than competing for the same attention.
  orDivider: { display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" },
  orDividerLine: { flex: 1, height: 1, background: "var(--color-border-3)" },
  orDividerText: { fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--color-muted-3)" },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--color-muted-2)", fontWeight: 600, margin: "0 2px 8px" },
  fourHandCard: { display: "block", padding: "13px 15px", border: "1.5px solid", borderRadius: 12, marginBottom: 6, cursor: "pointer" },
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
  guarantee: { fontSize: 11.5, color: "var(--color-muted-2)", textAlign: "center", margin: "0 0 12px" },
  continueButton: { width: "100%", border: "none", color: "#fff7f3", fontSize: 16, fontWeight: 600, padding: 16, borderRadius: 12, cursor: "pointer" },
  backButton: { width: "100%", marginTop: 9, border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, padding: 8, cursor: "pointer" },
};
