import { useState, type CSSProperties } from "react";
import { GUARANTEE_POINT, SMS_CONSENT_TEXT, terminologize } from "@/data/designCopy";
import { BookingModalState } from "@/features/booking/types";
import { StepProgress } from "@/features/booking/StepProgress";
import { formatPrice, formatSlotDay, formatSlotTime } from "@/lib/formatting";
import type { CartMenu, LandingVariantContent } from "@/types/api";

interface ConfirmStepProps {
  state: BookingModalState;
  cartMenu: CartMenu;
  currentStep: number;
  totalSteps: number;
  terminology?: LandingVariantContent["terminology"];
  onToggleSms: () => void;
  onToggleCancelAgree: () => void;
  onOpenPolicy: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function ConfirmStep({
  state,
  cartMenu,
  currentStep,
  totalSteps,
  terminology,
  onToggleSms,
  onToggleCancelAgree,
  onOpenPolicy,
  onSubmit,
  onBack,
}: ConfirmStepProps) {
  const slot = state.selectedSlot;
  const isFourHand = state.fourHandSelected;
  const smartMatch = !isFourHand && !!slot && slot.savings > 0;
  const total = isFourHand ? null : slot?.price ?? 0;
  const submitDisabled = (!isFourHand && !state.cancelAgree) || state.submitting;

  return (
    <div>
      <StepProgress current={currentStep} total={totalSteps} />
      <h3 style={styles.title}>{isFourHand ? "Confirm your request" : "Confirm & hold your spot"}</h3>

      {isFourHand ? (
        <div style={styles.callNotice}>
          <span style={{ flex: "none", fontSize: 18, lineHeight: 1.1 }}>📞</span>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--color-ink-soft)" }}>
            <strong style={{ color: "var(--color-accent)" }}>We'll call you to schedule.</strong> A 4-hand visit
            needs two techs, so we confirm the exact date, time &amp; pricing by phone — usually within a few hours.
          </span>
        </div>
      ) : null}

      {isFourHand && slot ? (
        <div style={styles.appointmentRow}>
          <span>Preferred time</span>
          <span style={{ color: "var(--color-ink)", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
            {formatSlotDay(slot.start_at)} · {formatSlotTime(slot.start_at)}
          </span>
        </div>
      ) : null}

      {isFourHand && cartMenu.four_hand_request.price != null ? (
        <div style={styles.appointmentRow}>
          <span>Estimated price</span>
          <span style={{ textAlign: "right" }}>
            {cartMenu.four_hand_request.compare_at_price != null && (
              <span style={{ textDecoration: "line-through", color: "var(--color-muted-3)", marginRight: 6 }}>
                {formatPrice(cartMenu.four_hand_request.compare_at_price)}
              </span>
            )}
            <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>
              {formatPrice(cartMenu.four_hand_request.price)}
            </span>
          </span>
        </div>
      ) : null}

      {smartMatch && slot ? <SmartMatchNote savings={slot.savings} /> : null}

      {!isFourHand && slot ? (
        <div style={styles.breakdownBox}>
          {slot.segments.map((seg) => (
            <div key={seg.service_slug} style={styles.lineItem}>
              <span>{terminologize(seg.name, terminology)}</span>
              <span>{formatPrice(seg.compare_at_price ?? seg.price)}</span>
            </div>
          ))}
          {slot.compare_at_price != null && slot.compare_at_price > slot.price ? (
            <div style={styles.subtotalRow}>
              <span>Subtotal</span>
              <span>{formatPrice(slot.compare_at_price)}</span>
            </div>
          ) : null}
          <div style={styles.discountRow}>
            <span>{smartMatch ? "First-visit & Smart Match savings" : "First-visit savings"}</span>
            <span>−{formatPrice(Math.max((slot.compare_at_price ?? slot.price) - slot.price, 0))}</span>
          </div>
          <div style={styles.totalRow}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--color-ink)" }}>Total today</span>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 24, color: "var(--color-accent)" }}>
              {formatPrice(total ?? 0)}
            </span>
          </div>
          <div style={styles.appointmentRow}>
            <span>Appointment</span>
            <span style={{ color: "var(--color-ink)", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
              {formatSlotDay(slot.start_at)} · {formatSlotTime(slot.start_at)}
            </span>
          </div>
        </div>
      ) : null}

      <label
        onClick={onToggleSms}
        style={{
          ...styles.smsCard,
          borderColor: state.smsOptIn ? "var(--color-accent)" : "var(--color-accent-border-soft)",
          background: state.smsOptIn ? "var(--color-accent-tint)" : "var(--color-accent-tint-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Checkbox checked={state.smsOptIn} border="var(--color-accent-border-soft)" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 600, fontSize: 14.5, color: "var(--color-ink)" }}>
              Text me reminders &amp; exclusive offers
            </span>
            <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-accent)", marginTop: 2 }}>
              {state.smsOptIn ? "You're in — enjoy VIP offers & booking updates." : "Never miss your slot + first dibs on last-minute openings"}
            </span>
          </span>
          <span
            style={{
              flex: "none",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: state.smsOptIn ? "#fff" : "var(--color-accent)",
              background: state.smsOptIn ? "var(--color-accent)" : "var(--color-accent-tint)",
              padding: "4px 8px",
              borderRadius: 20,
              whiteSpace: "nowrap",
            }}
          >
            {state.smsOptIn ? "On" : "Recommended"}
          </span>
        </div>
        <span style={{ display: "block", fontSize: 10.5, lineHeight: 1.45, color: "var(--color-muted-3)", marginTop: 10 }}>
          {SMS_CONSENT_TEXT}
        </span>
      </label>

      {!isFourHand ? (
        <label
          onClick={onToggleCancelAgree}
          style={{
            ...styles.cancelCard,
            borderColor: state.cancelAgree ? "var(--color-accent)" : "var(--color-border-3)",
          }}
        >
          <Checkbox checked={state.cancelAgree} border="var(--color-accent-border-soft)" topAlign />
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--color-muted)" }}>
            I agree to the{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenPolicy();
              }}
              style={{ color: "var(--color-accent)", textDecoration: "underline", fontWeight: 600 }}
            >
              Cancellation Policy
            </a>{" "}
            — reschedule or cancel at least 24 hours ahead, or a <strong style={{ color: "var(--color-accent)" }}>$25 fee</strong> may apply.
          </span>
        </label>
      ) : null}

      {state.submitError ? <div style={styles.errorBox}>{state.submitError}</div> : null}

      <div style={styles.guarantee}>
        <span aria-hidden="true">🛡️</span> {GUARANTEE_POINT.title} — {GUARANTEE_POINT.desc}
      </div>

      <button
        onClick={onSubmit}
        disabled={submitDisabled}
        style={{ ...styles.submitButton, background: submitDisabled ? "var(--color-accent-border-soft)" : "var(--color-accent)" }}
      >
        {state.submitting ? "Submitting…" : isFourHand ? "Send My Request" : "Confirm Booking"}
      </button>
      <button onClick={onBack} style={styles.backButton}>
        Back
      </button>
      <div style={styles.footnote}>
        {isFourHand
          ? "No payment now — we call to finalize everything."
          : "No payment required now — we'll confirm your appointment shortly."}
      </div>
    </div>
  );
}

/** Compact by design: the win itself (✦ + "you saved $X") should land in one glance — no
 * click required to feel it. "Details" is just there for the rare customer who wants the
 * why; most people will never tap it, and that's the point.
 */
function SmartMatchNote({ savings }: { savings: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={styles.smartMatchPill}>
      <div style={styles.smartMatchRow}>
        <span style={styles.smartMatchStar}>✦</span>
        <span style={styles.smartMatchLabel}>
          Smart Match applied — you saved <strong>{formatPrice(savings)}</strong>
        </span>
        <button type="button" onClick={() => setExpanded((e) => !e)} style={styles.smartMatchToggle}>
          {expanded ? "Less" : "Details"}
        </button>
      </div>
      {expanded ? (
        <div style={styles.smartMatchDetail}>
          We found you an excellent available specialist and automatically passed on a better rate. Same premium
          service, smarter price.
        </div>
      ) : null}
    </div>
  );
}

function Checkbox({ checked, border, topAlign = false }: { checked: boolean; border: string; topAlign?: boolean }) {
  return (
    <span
      style={{
        flex: "none",
        width: 22,
        height: 22,
        borderRadius: 6,
        border: `2px solid ${checked ? "var(--color-accent)" : border}`,
        background: checked ? "var(--color-accent)" : "#fff",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        marginTop: topAlign ? 1 : 0,
      }}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

const styles: Record<string, CSSProperties> = {
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "6px 0 14px" },
  callNotice: { display: "flex", alignItems: "flex-start", gap: 11, padding: "14px 15px", border: "1.5px solid var(--color-accent-border-soft)", borderRadius: 12, background: "var(--color-accent-tint-2)", marginBottom: 16 },
  smartMatchPill: { padding: "9px 12px", border: "1px solid var(--color-warm-gold-border)", borderRadius: 10, background: "var(--color-warm-gold-bg)", marginBottom: 16 },
  smartMatchRow: { display: "flex", alignItems: "center", gap: 7 },
  smartMatchStar: { flex: "none", fontSize: 13, color: "var(--color-warm-gold-text)" },
  smartMatchLabel: { flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: "var(--color-warm-gold-text)" },
  smartMatchToggle: { flex: "none", border: "none", background: "none", padding: 0, fontSize: 11, fontWeight: 600, color: "var(--color-warm-gold-text-2)", textDecoration: "underline", cursor: "pointer" },
  smartMatchDetail: { marginTop: 6, fontSize: 11.5, lineHeight: 1.5, color: "var(--color-warm-gold-text-2)" },
  breakdownBox: { padding: 16, border: "1px solid var(--color-border-2)", borderRadius: 12, background: "var(--color-accent-tint-2)", marginBottom: 16 },
  lineItem: { display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "3px 0", color: "var(--color-ink-soft)" },
  subtotalRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0 3px", marginTop: 5, borderTop: "1px dashed #e3d3ca", color: "var(--color-muted-2)" },
  discountRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "var(--color-accent)", fontWeight: 600 },
  totalRow: { borderTop: "1px solid var(--color-border-3)", marginTop: 8, paddingTop: 9, display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  appointmentRow: { marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-muted)" },
  smsCard: { display: "block", padding: "15px 16px", border: "2px solid", borderRadius: 14, cursor: "pointer", marginBottom: 16 },
  cancelCard: { display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 14px", border: "1px solid", borderRadius: 12, cursor: "pointer", background: "var(--color-accent-tint-2)" },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: "#fbeceb", color: "var(--color-danger)", fontSize: 13 },
  guarantee: { fontSize: 11.5, color: "var(--color-muted-2)", textAlign: "center", marginTop: 14 },
  submitButton: { width: "100%", marginTop: 16, border: "none", color: "#fff7f3", fontSize: 16, fontWeight: 600, padding: 16, borderRadius: 12, cursor: "pointer" },
  backButton: { width: "100%", marginTop: 9, border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, padding: 8, cursor: "pointer" },
  footnote: { fontSize: 10.5, color: "var(--color-muted-3)", textAlign: "center", marginTop: 10 },
};
