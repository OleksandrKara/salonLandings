import type { BookingConfirmation, FourHandRequestConfirmation, SlotOption } from "@/types/api";

export type BookingStep = 1 | 2 | 3 | 4;

export interface BookingModalState {
  isOpen: boolean;
  step: BookingStep;
  done: boolean;

  // Step 1 — contact info
  givenName: string;
  phone: string;
  email: string;

  // Step 2 — services cart
  maniSelected: boolean;
  pedicureSelected: boolean;
  designSelected: boolean;
  fourHandSelected: boolean;

  // Step 3 — date & time
  selectedSlot: SlotOption | null;

  // Step 4 — confirm
  smsOptIn: boolean;
  cancelAgree: boolean;
  submitting: boolean;
  submitError: string | null;

  // Done
  bookingConfirmation: BookingConfirmation | null;
  fourHandConfirmation: FourHandRequestConfirmation | null;
}

export const initialBookingModalState: BookingModalState = {
  isOpen: false,
  step: 1,
  done: false,
  givenName: "",
  phone: "",
  email: "",
  maniSelected: true,
  pedicureSelected: false,
  designSelected: false,
  fourHandSelected: false,
  selectedSlot: null,
  smsOptIn: false,
  cancelAgree: false,
  submitting: false,
  submitError: null,
  bookingConfirmation: null,
  fourHandConfirmation: null,
};
