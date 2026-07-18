import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CancellationPolicyModal } from "@/features/booking/CancellationPolicyModal";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";
import { isContactReady, kindAtStep, selectedServiceSlugs } from "@/features/booking/useBookingModal";
import { ConfirmStep } from "@/features/booking/steps/ConfirmStep";
import { ContactStep } from "@/features/booking/steps/ContactStep";
import { DateTimeStep } from "@/features/booking/steps/DateTimeStep";
import { DoneStep } from "@/features/booking/steps/DoneStep";
import { ServicesStep } from "@/features/booking/steps/ServicesStep";
import { TurnstileWidget } from "@/features/booking/TurnstileWidget";
import { useCartMenu } from "@/features/landing/CartMenuContext";
import { BOOKING_FLOWS, type BookingFlowStep, type ContactStepPosition } from "@/lib/funnelFlow";
import { recordBookingFunnelStep } from "@/lib/tracking";
import type { LandingVariantContent } from "@/types/api";

export function BookingModal({
  terminology,
  position = "start",
}: {
  terminology?: LandingVariantContent["terminology"];
  position?: ContactStepPosition;
}) {
  const {
    state,
    close,
    stop,
    setGivenName,
    setPhone,
    setEmail,
    setWebsite,
    setTurnstileToken,
    toggleMani,
    togglePedicure,
    toggleDesign,
    toggleFourHand,
    advanceFromContact,
    advanceFromServices,
    selectSlot,
    back,
    toggleSms,
    toggleCancelAgree,
    submit,
  } = useBookingModalContext();
  const { cartMenu } = useCartMenu();
  const [policyOpen, setPolicyOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const trackedStepsRef = useRef<{ formOpenedAt: string; steps: Set<BookingFlowStep> }>({
    formOpenedAt: "",
    steps: new Set(),
  });

  const flow = BOOKING_FLOWS[position];
  const currentKind = kindAtStep(flow.steps, state.step);

  // Booking-funnel step tracking (see marketing.funnel_events / lib/funnelFlow.ts). Fires once
  // per step newly reached this modal session — keyed off formOpenedAt so a fresh open() (a new
  // formOpenedAt) resets the dedup set, while back-navigation within the same session doesn't
  // re-fire for a step already reached. "done" isn't tracked here — booking_completed already
  // covers completion more reliably (Square-backed, not a best-effort client beacon).
  useEffect(() => {
    if (!state.isOpen) return;
    if (trackedStepsRef.current.formOpenedAt !== state.formOpenedAt) {
      trackedStepsRef.current = { formOpenedAt: state.formOpenedAt, steps: new Set() };
    }
    if (!trackedStepsRef.current.steps.has(currentKind)) {
      trackedStepsRef.current.steps.add(currentKind);
      recordBookingFunnelStep(currentKind, flow.flowKey, state.step - 1, flow.steps.length);
    }
  }, [state.isOpen, currentKind, state.formOpenedAt, flow, state.step]);

  // If the visitor hits the browser back button off the /thank-you URL, dismiss
  // the confirmation sheet too so the UI matches the address bar.
  useEffect(() => {
    if (!state.done) return;
    const handlePopState = () => close();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [state.done, close]);

  // The page behind the sheet shouldn't scroll while it's open — otherwise the visitor can
  // drag the background out from under a fixed-position overlay, which reads as broken.
  useEffect(() => {
    if (!state.isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [state.isOpen]);

  // The sheet is one long-lived scroll container reused across every step (never remounted), so
  // without this a step that opens already scrolled — e.g. Step 3 rendering scrolled to the
  // bottom because Step 2 was left scrolled down before "Continue" was tapped — would just keep
  // whatever scrollTop the previous step ended on.
  useEffect(() => {
    sheetRef.current?.scrollTo({ top: 0 });
  }, [state.step, state.done]);

  if (!state.isOpen || !cartMenu) return null;

  // Four-hand now goes through the same steps as every other path (it picks a real preferred
  // slot too — see useBookingModal's shiftKind) so the count is simply the flow's length.
  const stepLabel = `Step ${state.step} of ${flow.steps.length}`;

  return (
    <div onClick={close} style={styles.overlay}>
      <div ref={sheetRef} onClick={stop} style={styles.sheet}>
        <div style={styles.grabberRow}>
          <div style={styles.grabber} />
          <button onClick={close} style={styles.closeButton} aria-label="Close">
            ×
          </button>
        </div>

        {state.done ? (
          <DoneStep
            givenName={state.givenName}
            bookingConfirmation={state.bookingConfirmation}
            fourHandConfirmation={state.fourHandConfirmation}
            fourHandSlot={state.selectedSlot}
            fourHandRequestedServices={
              [state.maniSelected && "manicure", state.pedicureSelected && "pedicure"].filter(Boolean).join(" + ") || null
            }
            onClose={close}
          />
        ) : currentKind === "contact" ? (
          <ContactStep
            manicure={cartMenu.manicure}
            stepLabel={stepLabel}
            givenName={state.givenName}
            phone={state.phone}
            email={state.email}
            website={state.website}
            onGivenNameChange={setGivenName}
            onPhoneChange={setPhone}
            onEmailChange={setEmail}
            onWebsiteChange={setWebsite}
            onContinue={advanceFromContact}
            canContinue={isContactReady(state)}
            onBack={state.step > 1 ? back : undefined}
          />
        ) : currentKind === "services" ? (
          <ServicesStep
            cartMenu={cartMenu}
            state={state}
            stepLabel={stepLabel}
            terminology={terminology}
            onToggleMani={toggleMani}
            onTogglePedicure={togglePedicure}
            onToggleDesign={toggleDesign}
            onToggleFourHand={toggleFourHand}
            onContinue={advanceFromServices}
            onBack={state.step > 1 ? back : undefined}
          />
        ) : currentKind === "datetime" ? (
          <DateTimeStep
            serviceSlugs={selectedServiceSlugs(state)}
            stepLabel={stepLabel}
            onSelectSlot={selectSlot}
            onBack={back}
          />
        ) : (
          <>
            <TurnstileWidget onToken={setTurnstileToken} />
            <ConfirmStep
              state={state}
              stepLabel={stepLabel}
              terminology={terminology}
              onToggleSms={toggleSms}
              onToggleCancelAgree={toggleCancelAgree}
              onOpenPolicy={() => setPolicyOpen(true)}
              onSubmit={() => submit(state)}
              onBack={back}
            />
          </>
        )}
      </div>
      {policyOpen ? <CancellationPolicyModal onClose={() => setPolicyOpen(false)} /> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 60,
    background: "rgba(30,18,14,0.5)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    animation: "fadeIn 0.2s ease",
  },
  sheet: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    background: "var(--color-card)",
    borderRadius: "22px 22px 0 0",
    padding: "20px 22px 30px",
    animation: "sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)",
    maxHeight: "95vh",
    overflowY: "auto",
  },
  grabberRow: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 24, marginBottom: 8 },
  grabber: { width: 38, height: 4, borderRadius: 2, background: "#e3d3ca" },
  closeButton: { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#f4ece7", border: "none", borderRadius: "50%", fontSize: 20, color: "var(--color-muted-2)", cursor: "pointer", lineHeight: 1, padding: 0 },
};
