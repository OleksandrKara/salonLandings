import { apiPost } from "@/api/client";
import type {
  BookingConfirmation,
  BookingRequest,
  FourHandRequestConfirmation,
  FourHandRequestSubmission,
} from "@/types/api";

export function createBooking(request: BookingRequest): Promise<BookingConfirmation> {
  return apiPost<BookingConfirmation>("/api/bookings", request);
}

export function submitFourHandRequest(
  submission: FourHandRequestSubmission,
): Promise<FourHandRequestConfirmation> {
  return apiPost<FourHandRequestConfirmation>("/api/bookings/four-hand-request", submission);
}
