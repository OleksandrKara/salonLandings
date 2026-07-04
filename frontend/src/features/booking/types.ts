import type { BookingConfirmation, CustomerContact, ServiceOffer, SlotOption } from "@/types/api";

export type BookingStep = "offer" | "artist" | "slot" | "contact" | "confirmation";

export const STEP_ORDER: BookingStep[] = ["offer", "artist", "slot", "contact", "confirmation"];

export interface BookingFlowState {
  step: BookingStep;
  selectedOffer: ServiceOffer | null;
  artistSelection: string; // "any" | team_member_id
  selectedSlot: SlotOption | null;
  customer: Partial<CustomerContact>;
  confirmation: BookingConfirmation | null;
}

export const initialBookingFlowState: BookingFlowState = {
  step: "offer",
  selectedOffer: null,
  artistSelection: "any",
  selectedSlot: null,
  customer: {},
  confirmation: null,
};
