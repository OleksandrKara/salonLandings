import { StepShell } from "@/components/layout/StepShell";
import { ArtistStep } from "@/features/booking/steps/ArtistStep";
import { ConfirmationStep } from "@/features/booking/steps/ConfirmationStep";
import { ContactStep } from "@/features/booking/steps/ContactStep";
import { OfferStep } from "@/features/booking/steps/OfferStep";
import { SlotStep } from "@/features/booking/steps/SlotStep";
import { useBookingFlow } from "@/features/booking/useBookingFlow";
import { STEP_ORDER } from "@/features/booking/types";

export function BookingFlow() {
  const { state, goBack, selectOffer, selectArtist, selectSlot, completeBooking, restart } = useBookingFlow();

  if (state.step === "offer") {
    return <OfferStep onSelectOffer={selectOffer} />;
  }

  if (state.step === "confirmation" && state.confirmation) {
    return <ConfirmationStep confirmation={state.confirmation} onBookAnother={restart} />;
  }

  // Every other step requires an offer to already be selected.
  if (!state.selectedOffer) {
    return <OfferStep onSelectOffer={selectOffer} />;
  }

  const stepIndex = STEP_ORDER.indexOf(state.step);

  return (
    <StepShell
      title={stepTitle(state.step)}
      subtitle={state.selectedOffer.name}
      step={stepIndex}
      totalSteps={STEP_ORDER.length - 1}
      onBack={goBack}
    >
      {state.step === "artist" ? (
        <ArtistStep offer={state.selectedOffer} onSelectArtist={selectArtist} />
      ) : null}

      {state.step === "slot" ? (
        <SlotStep
          offer={state.selectedOffer}
          artistSelection={state.artistSelection}
          onSelectSlot={selectSlot}
        />
      ) : null}

      {state.step === "contact" && state.selectedSlot ? (
        <ContactStep
          offer={state.selectedOffer}
          slot={state.selectedSlot}
          onBookingConfirmed={completeBooking}
        />
      ) : null}
    </StepShell>
  );
}

function stepTitle(step: string): string {
  switch (step) {
    case "artist":
      return "Choose your artist";
    case "slot":
      return "Pick a time";
    case "contact":
      return "Your details";
    default:
      return "";
  }
}
