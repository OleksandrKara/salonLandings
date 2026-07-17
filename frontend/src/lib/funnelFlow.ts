import type { LandingVariantContent } from "@/types/api";

/** Mirrors LandingVariantContent.contactStepPosition — "start" (today's default) or "end". */
export type ContactStepPosition = NonNullable<LandingVariantContent["contactStepPosition"]>;

export type BookingFlowStep = "contact" | "services" | "datetime" | "confirm";

/**
 * This app's booking-flow step order/labels, for booking-funnel tracking
 * (see marketing.funnel_events). Differently-shaped booking flows — mani's default asks for
 * contact info first; akluxnails-home's homepage asks last; mani's "end" variant also asks last —
 * don't need to share step names, just this {flowKey, steps} shape, so the dashboard can compare
 * them by relative position instead of by step name. Adding a step later needs no backend/
 * dashboard change — step_index and step_count_total are derived from this list at send time.
 *
 * Keyed by ContactStepPosition rather than a single fixed constant so a variant whose
 * `content.contactStepPosition` is "end" gets its own genuinely-different flow_key
 * ("mani_booking_v2") instead of mixing differently-ordered step data into "mani_booking_v1".
 */
export const BOOKING_FLOWS: Record<ContactStepPosition, { flowKey: string; steps: readonly BookingFlowStep[] }> = {
  start: { flowKey: "mani_booking_v1", steps: ["contact", "services", "datetime", "confirm"] },
  end: { flowKey: "mani_booking_v2", steps: ["services", "datetime", "contact", "confirm"] },
};
