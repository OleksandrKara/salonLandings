import { useCallback, useState } from "react";
import { createBooking, submitFourHandRequest } from "@/api/bookings";
import { ApiError } from "@/api/client";
import type { BookingConfirmation, CartMenu, SlotOption } from "@/types/api";
import { BookingModalState, BookingStep, initialBookingModalState } from "@/features/booking/types";
import { logExperimentEvent } from "@/lib/experiments";
import { getTrackingSnapshot, recordMetaBookingConversion } from "@/lib/tracking";
import { enterThankYouUrl, exitThankYouUrl } from "@/lib/thankYouUrl";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);
  if (digits.length > 6) return `(${a}) ${b}-${c}`;
  if (digits.length > 3) return `(${a}) ${b}`;
  if (digits.length > 0) return `(${a}`;
  return "";
}

export function selectedServiceSlugs(state: BookingModalState): string[] {
  const slugs: string[] = [];
  if (state.maniSelected) slugs.push("manicure");
  if (state.pedicureSelected) slugs.push("pedicure");
  if (state.maniSelected && state.designSelected) slugs.push("design");
  return slugs;
}

export function estimatedTotal(state: BookingModalState, cartMenu: CartMenu): number {
  let total = 0;
  if (state.maniSelected) total += cartMenu.manicure.pricing[0].price;
  if (state.pedicureSelected) total += cartMenu.pedicure.pricing[0].price;
  if (state.maniSelected && state.designSelected) total += cartMenu.design_addon.price;
  return total;
}

export function useBookingModal() {
  const [state, setState] = useState<BookingModalState>(initialBookingModalState);

  const open = useCallback(() => setState({ ...initialBookingModalState, isOpen: true }), []);
  const close = useCallback(() => {
    exitThankYouUrl();
    setState((s) => ({ ...s, isOpen: false }));
  }, []);
  const stop = useCallback((e: { stopPropagation: () => void }) => e.stopPropagation(), []);

  const setGivenName = useCallback((v: string) => setState((s) => ({ ...s, givenName: v })), []);
  const setEmail = useCallback((v: string) => setState((s) => ({ ...s, email: v })), []);
  const setPhone = useCallback((v: string) => setState((s) => ({ ...s, phone: formatPhone(v) })), []);

  const toggleMani = useCallback(() => {
    setState((s) => {
      if (s.fourHandSelected) return { ...s, fourHandSelected: false, maniSelected: true };
      const maniLast = s.maniSelected && !s.pedicureSelected;
      if (maniLast) return s; // must keep at least one service selected
      const maniSelected = !s.maniSelected;
      return { ...s, maniSelected, designSelected: maniSelected ? s.designSelected : false };
    });
  }, []);

  const togglePedicure = useCallback(() => {
    setState((s) => {
      const pediLast = s.pedicureSelected && !s.maniSelected;
      if (pediLast) return s;
      return { ...s, fourHandSelected: false, pedicureSelected: !s.pedicureSelected };
    });
  }, []);

  const toggleDesign = useCallback(() => setState((s) => ({ ...s, designSelected: !s.designSelected })), []);

  const toggleFourHand = useCallback(() => {
    setState((s) => {
      const on = !s.fourHandSelected;
      return {
        ...s,
        fourHandSelected: on,
        maniSelected: on ? false : true,
        pedicureSelected: on ? false : s.pedicureSelected,
        designSelected: on ? false : s.designSelected,
      };
    });
  }, []);

  const goToStep = useCallback((step: BookingStep) => setState((s) => ({ ...s, step })), []);

  const next1 = useCallback(() => {
    setState((s) => (isStep1Ready(s) ? { ...s, step: 2 } : s));
  }, []);

  const next2 = useCallback(() => {
    setState((s) => {
      const anySelected = s.fourHandSelected || s.maniSelected || s.pedicureSelected;
      if (!anySelected) return s;
      return { ...s, step: s.fourHandSelected ? 4 : 3 };
    });
  }, []);

  const selectSlot = useCallback((slot: SlotOption) => setState((s) => ({ ...s, selectedSlot: slot, step: 4 })), []);

  const back = useCallback(() => {
    setState((s) => {
      if (s.step === 4) return { ...s, step: s.fourHandSelected ? 2 : 3 };
      return { ...s, step: Math.max(1, s.step - 1) as BookingStep };
    });
  }, []);

  const toggleSms = useCallback(() => setState((s) => ({ ...s, smsOptIn: !s.smsOptIn })), []);
  const toggleCancelAgree = useCallback(() => setState((s) => ({ ...s, cancelAgree: !s.cancelAgree })), []);

  const submit = useCallback(async (current: BookingModalState) => {
    setState((s) => ({ ...s, submitting: true, submitError: null }));

    const familyName = "Client"; // design collects first name + phone/email only
    const tracking = getTrackingSnapshot();
    logExperimentEvent("booking_started", tracking.landing_page_id ?? null, tracking.variant_id ?? null);

    try {
      if (current.fourHandSelected) {
        const requested = [current.maniSelected && "manicure", current.pedicureSelected && "pedicure"]
          .filter(Boolean)
          .join(" + ");
        const confirmation = await submitFourHandRequest({
          customer: {
            given_name: current.givenName.trim(),
            family_name: familyName,
            email_address: current.email.trim(),
            phone_number: current.phone.trim(),
            marketing_opt_in: current.smsOptIn,
          },
          requested_services: requested || "4-hand service",
          tracking,
        });
        enterThankYouUrl();
        recordMetaBookingConversion();
        setState((s) => ({ ...s, submitting: false, done: true, fourHandConfirmation: confirmation }));
        return;
      }

      const slot = current.selectedSlot;
      if (!slot) {
        setState((s) => ({ ...s, submitting: false, submitError: "Please choose a time first." }));
        return;
      }

      const confirmation: BookingConfirmation = await createBooking({
        slot: {
          start_at: slot.start_at,
          team_member_id: slot.team_member_id,
          segments: slot.segments.map((seg) => ({
            service_slug: seg.service_slug,
            service_variation_id: seg.variation_id,
            service_variation_version: seg.variation_version,
          })),
        },
        customer: {
          given_name: current.givenName.trim(),
          family_name: familyName,
          email_address: current.email.trim(),
          phone_number: current.phone.trim(),
          marketing_opt_in: current.smsOptIn,
        },
        sms_opt_in: current.smsOptIn,
        tracking,
      });
      logExperimentEvent("booking_completed", tracking.landing_page_id ?? null, tracking.variant_id ?? null);
      enterThankYouUrl();
      recordMetaBookingConversion();
      setState((s) => ({ ...s, submitting: false, done: true, bookingConfirmation: confirmation }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "We couldn't confirm your appointment. Please try again.";
      setState((s) => ({ ...s, submitting: false, submitError: message }));
    }
  }, []);

  return {
    state,
    open,
    close,
    stop,
    setGivenName,
    setEmail,
    setPhone,
    toggleMani,
    togglePedicure,
    toggleDesign,
    toggleFourHand,
    goToStep,
    next1,
    next2,
    selectSlot,
    back,
    toggleSms,
    toggleCancelAgree,
    submit,
  };
}

export function isStep1Ready(state: BookingModalState): boolean {
  const phoneDigits = state.phone.replace(/\D/g, "");
  return state.givenName.trim().length > 0 && phoneDigits.length === 10;
}
