import { useEffect, useState, type CSSProperties } from "react";
import { CancellationPolicyModal } from "@/features/booking/CancellationPolicyModal";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";
import { selectedServiceSlugs } from "@/features/booking/useBookingModal";
import { ConfirmStep } from "@/features/booking/steps/ConfirmStep";
import { ContactStep } from "@/features/booking/steps/ContactStep";
import { DateTimeStep } from "@/features/booking/steps/DateTimeStep";
import { DoneStep } from "@/features/booking/steps/DoneStep";
import { ServicesStep } from "@/features/booking/steps/ServicesStep";
import { useCartMenu } from "@/features/landing/CartMenuContext";
import { isStep1Ready } from "@/features/booking/useBookingModal";

export function BookingModal() {
  const { state, close, stop, setGivenName, setPhone, setEmail, toggleMani, togglePedicure, toggleDesign, toggleFourHand, next1, next2, selectSlot, back, toggleSms, toggleCancelAgree, submit } =
    useBookingModalContext();
  const { cartMenu } = useCartMenu();
  const [policyOpen, setPolicyOpen] = useState(false);

  // If the visitor hits the browser back button off the /thank-you URL, dismiss
  // the confirmation sheet too so the UI matches the address bar.
  useEffect(() => {
    if (!state.done) return;
    const handlePopState = () => close();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [state.done, close]);

  if (!state.isOpen || !cartMenu) return null;

  const stepLabel = state.fourHandSelected ? `Step ${state.step === 4 ? 3 : state.step} of 3` : `Step ${state.step} of 4`;

  return (
    <div onClick={close} style={styles.overlay}>
      <div onClick={stop} style={styles.sheet}>
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
            onClose={close}
          />
        ) : state.step === 1 ? (
          <ContactStep
            manicure={cartMenu.manicure}
            stepLabel={stepLabel}
            givenName={state.givenName}
            phone={state.phone}
            email={state.email}
            onGivenNameChange={setGivenName}
            onPhoneChange={setPhone}
            onEmailChange={setEmail}
            onContinue={next1}
            canContinue={isStep1Ready(state)}
          />
        ) : state.step === 2 ? (
          <ServicesStep
            cartMenu={cartMenu}
            state={state}
            stepLabel={stepLabel}
            onToggleMani={toggleMani}
            onTogglePedicure={togglePedicure}
            onToggleDesign={toggleDesign}
            onToggleFourHand={toggleFourHand}
            onContinue={next2}
            onBack={back}
          />
        ) : state.step === 3 ? (
          <DateTimeStep
            serviceSlugs={selectedServiceSlugs(state)}
            stepLabel={stepLabel}
            onSelectSlot={selectSlot}
            onBack={back}
          />
        ) : (
          <ConfirmStep
            state={state}
            stepLabel={stepLabel}
            onToggleSms={toggleSms}
            onToggleCancelAgree={toggleCancelAgree}
            onOpenPolicy={() => setPolicyOpen(true)}
            onSubmit={() => submit(state)}
            onBack={back}
          />
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
