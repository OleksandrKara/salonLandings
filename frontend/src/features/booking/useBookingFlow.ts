import { useCallback, useState } from "react";
import type { BookingConfirmation, CustomerContact, ServiceOffer, SlotOption } from "@/types/api";
import { BookingFlowState, BookingStep, initialBookingFlowState, STEP_ORDER } from "@/features/booking/types";

export function useBookingFlow() {
  const [state, setState] = useState<BookingFlowState>(initialBookingFlowState);

  const goToStep = useCallback((step: BookingStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEP_ORDER.indexOf(prev.step);
      if (currentIndex <= 0) return prev;
      return { ...prev, step: STEP_ORDER[currentIndex - 1] };
    });
  }, []);

  const selectOffer = useCallback((offer: ServiceOffer) => {
    setState((prev) => ({ ...prev, selectedOffer: offer, step: "artist" }));
  }, []);

  const selectArtist = useCallback((artistSelection: string) => {
    setState((prev) => ({ ...prev, artistSelection, step: "slot" }));
  }, []);

  const selectSlot = useCallback((slot: SlotOption) => {
    setState((prev) => ({ ...prev, selectedSlot: slot, step: "contact" }));
  }, []);

  const submitContact = useCallback((customer: CustomerContact) => {
    setState((prev) => ({ ...prev, customer }));
  }, []);

  const completeBooking = useCallback((confirmation: BookingConfirmation) => {
    setState((prev) => ({ ...prev, confirmation, step: "confirmation" }));
  }, []);

  const restart = useCallback(() => {
    setState(initialBookingFlowState);
  }, []);

  return { state, goToStep, goBack, selectOffer, selectArtist, selectSlot, submitContact, completeBooking, restart };
}
