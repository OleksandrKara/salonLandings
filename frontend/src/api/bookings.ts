import { apiPost } from "@/api/client";
import type { BookingConfirmation, BookingRequest } from "@/types/api";

export function createBooking(request: BookingRequest): Promise<BookingConfirmation> {
  return apiPost<BookingConfirmation>("/api/bookings", request);
}
