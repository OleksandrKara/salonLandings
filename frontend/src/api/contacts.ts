import { apiPost } from "@/api/client";
import type { TrackingSnapshot } from "@/types/api";

interface ContactCaptureRequest {
  given_name: string;
  phone_number: string;
  email_address: string | null;
  tracking: TrackingSnapshot;
}

interface ContactCaptureResponse {
  recorded: boolean;
}

/** Fire-and-forget: captures a lead as soon as Step 1 is submitted, before a real Square
 * booking (and thus a Square customer) exists. A failure here must never affect the visitor.
 */
export function captureContact(request: ContactCaptureRequest): void {
  apiPost<ContactCaptureResponse>("/api/contacts", request).catch(() => {
    // lead capture only — nothing to recover, nothing to surface to the visitor
  });
}
