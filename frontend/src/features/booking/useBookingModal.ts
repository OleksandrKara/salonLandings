import { useCallback, useState } from "react";
import { createBooking, submitFourHandRequest } from "@/api/bookings";
import { captureContact } from "@/api/contacts";
import { ApiError } from "@/api/client";
import type { BookingConfirmation, CartMenu, SlotOption } from "@/types/api";
import { BookingModalState, BookingStep, initialBookingModalState } from "@/features/booking/types";
import { BOOKING_FLOWS, type BookingFlowStep, type ContactStepPosition } from "@/lib/funnelFlow";
import { logExperimentEvent } from "@/lib/experiments";
import { getTrackingSnapshot, recordMetaBookingConversion } from "@/lib/tracking";
import { enterThankYouUrl, exitThankYouUrl } from "@/lib/thankYouUrl";

/** Which BookingFlowStep kind renders at a given 1-based numeric BookingStep, for this flow. */
export function kindAtStep(steps: readonly BookingFlowStep[], step: BookingStep): BookingFlowStep {
  return steps[step - 1];
}

/** The 1-based numeric BookingStep a given kind renders at, for this flow. */
function stepOfKind(steps: readonly BookingFlowStep[], kind: BookingFlowStep): BookingStep {
  return (steps.indexOf(kind) + 1) as BookingStep;
}

/** Moves one kind forward/back in `steps`. Four-hand now goes through the same datetime step as
 * every other path (it picks a real preferred slot too — see
 * BookingService.submit_four_hand_request — just without a real Square appointment behind it), so
 * there's no more skip-over-datetime special case here. Clamped to the flow's bounds, so calling
 * this from the first/last kind is a safe no-op. */
function shiftKind(steps: readonly BookingFlowStep[], kind: BookingFlowStep, delta: 1 | -1): BookingFlowStep {
  const idx = Math.max(0, Math.min(steps.length - 1, steps.indexOf(kind) + delta));
  return steps[idx];
}

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
  if (state.fourHandSelected) return ["four-hand-request"];
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

export function useBookingModal(position: ContactStepPosition = "start") {
  const [state, setState] = useState<BookingModalState>(initialBookingModalState);
  const steps = BOOKING_FLOWS[position].steps;

  const open = useCallback(() => {
    const tracking = getTrackingSnapshot();
    logExperimentEvent("click", tracking.landing_page_id ?? null, tracking.variant_id ?? null, { target: "book_now" });
    setState({ ...initialBookingModalState, isOpen: true, formOpenedAt: new Date().toISOString() });
  }, []);
  const close = useCallback(() => {
    exitThankYouUrl();
    setState((s) => ({ ...s, isOpen: false }));
  }, []);
  const stop = useCallback((e: { stopPropagation: () => void }) => e.stopPropagation(), []);

  const setGivenName = useCallback((v: string) => setState((s) => ({ ...s, givenName: v })), []);
  const setEmail = useCallback((v: string) => setState((s) => ({ ...s, email: v })), []);
  const setPhone = useCallback((v: string) => setState((s) => ({ ...s, phone: formatPhone(v) })), []);
  const setWebsite = useCallback((v: string) => setState((s) => ({ ...s, website: v })), []);
  const setTurnstileToken = useCallback((token: string | null) => setState((s) => ({ ...s, turnstileToken: token })), []);

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

  const advanceFromContact = useCallback(() => {
    setState((s) => {
      if (!isContactReady(s)) return s;
      // Fire-and-forget lead capture — before a real Square customer exists, so this must
      // never block advancing past the contact step, wherever it falls in this flow.
      captureContact({
        given_name: s.givenName.trim(),
        phone_number: s.phone.trim(),
        email_address: s.email.trim() || null,
        tracking: getTrackingSnapshot(),
      });
      const nextKind = shiftKind(steps, "contact", 1);
      return { ...s, step: stepOfKind(steps, nextKind) };
    });
  }, [steps]);

  const advanceFromServices = useCallback(() => {
    setState((s) => {
      const anySelected = s.fourHandSelected || s.maniSelected || s.pedicureSelected;
      if (!anySelected) return s;
      const nextKind = shiftKind(steps, "services", 1);
      return { ...s, step: stepOfKind(steps, nextKind) };
    });
  }, [steps]);

  const selectSlot = useCallback(
    (slot: SlotOption) =>
      setState((s) => {
        const nextKind = shiftKind(steps, "datetime", 1);
        return { ...s, selectedSlot: slot, step: stepOfKind(steps, nextKind) };
      }),
    [steps],
  );

  const back = useCallback(() => {
    setState((s) => {
      const currentKind = kindAtStep(steps, s.step);
      const prevKind = shiftKind(steps, currentKind, -1);
      return { ...s, step: stepOfKind(steps, prevKind) };
    });
  }, [steps]);

  const toggleSms = useCallback(() => setState((s) => ({ ...s, smsOptIn: !s.smsOptIn })), []);
  const toggleCancelAgree = useCallback(() => setState((s) => ({ ...s, cancelAgree: !s.cancelAgree })), []);

  const submit = useCallback(async (current: BookingModalState) => {
    setState((s) => ({ ...s, submitting: true, submitError: null }));

    const familyName = "Client"; // design collects first name + phone/email only
    const tracking = getTrackingSnapshot();
    logExperimentEvent("booking_started", tracking.landing_page_id ?? null, tracking.variant_id ?? null);

    try {
      const slot = current.selectedSlot;
      if (!slot) {
        setState((s) => ({ ...s, submitting: false, submitError: "Please choose a time first." }));
        return;
      }

      if (current.fourHandSelected) {
        const requested = [current.maniSelected && "manicure", current.pedicureSelected && "pedicure"]
          .filter(Boolean)
          .join(" + ");
        const confirmation = await submitFourHandRequest({
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
            email_address: current.email.trim() || null,
            phone_number: current.phone.trim(),
            marketing_opt_in: current.smsOptIn,
          },
          requested_services: requested || "4-hand service",
          tracking,
          website: current.website,
          form_rendered_at: current.formOpenedAt,
          turnstile_token: current.turnstileToken,
        });
        enterThankYouUrl();
        recordMetaBookingConversion();
        setState((s) => ({ ...s, submitting: false, done: true, fourHandConfirmation: confirmation }));
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
          email_address: current.email.trim() || null,
          phone_number: current.phone.trim(),
          marketing_opt_in: current.smsOptIn,
        },
        sms_opt_in: current.smsOptIn,
        tracking,
        website: current.website,
        form_rendered_at: current.formOpenedAt,
        turnstile_token: current.turnstileToken,
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
    setWebsite,
    setTurnstileToken,
    toggleMani,
    togglePedicure,
    toggleDesign,
    toggleFourHand,
    goToStep,
    advanceFromContact,
    advanceFromServices,
    selectSlot,
    back,
    toggleSms,
    toggleCancelAgree,
    submit,
  };
}

export function isContactReady(state: BookingModalState): boolean {
  const phoneDigits = state.phone.replace(/\D/g, "");
  return state.givenName.trim().length > 0 && phoneDigits.length === 10;
}
