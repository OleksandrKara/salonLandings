// Mirrors backend/app/domain/schemas.py — keep in sync with the API contract.

export type ArtistTier = "top" | "regular";

export interface TierPricing {
  tier: ArtistTier;
  variation_id: string;
  variation_version: number;
  price: number;
  compare_at_price: number | null;
  duration_minutes: number;
  team_member_ids: string[];
}

export interface ServiceOffer {
  slug: string;
  name: string;
  offer_label: string | null;
  description: string | null;
  is_first_time_offer: boolean;
  pricing: TierPricing[];
}

export interface FlatAddon {
  slug: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  variation_id: string;
  variation_version: number;
  team_member_ids: string[];
  requires_slug: string;
}

export interface FourHandRequestInfo {
  slug: string;
  name: string;
  description: string;
  price_description: string | null;
  price: number | null;
  compare_at_price: number | null;
}

export interface CartMenu {
  manicure: ServiceOffer;
  pedicure: ServiceOffer;
  design_addon: FlatAddon;
  four_hand_request: FourHandRequestInfo;
}

export interface Artist {
  id: string;
  display_name: string;
  tier: ArtistTier;
  bio: string | null;
  photo_url: string | null;
}

export interface SegmentOption {
  service_slug: string;
  name: string;
  variation_id: string;
  variation_version: number;
  price: number;
  compare_at_price: number | null;
  duration_minutes: number;
}

export interface SlotOption {
  start_at: string;
  end_at: string;
  duration_minutes: number;
  team_member_id: string;
  artist_name: string | null;
  tier: ArtistTier;
  price: number;
  compare_at_price: number | null;
  advertised_price: number;
  savings: number;
  is_best_price: boolean;
  segments: SegmentOption[];
}

export interface AvailabilityResponse {
  services: string[];
  artist_selection: string;
  slots: SlotOption[];
}

export interface CustomerContact {
  given_name: string;
  family_name: string;
  email_address: string | null;
  phone_number: string;
  marketing_opt_in: boolean;
}

export interface TrackingSnapshot {
  visitor_id: string;
  landing_path?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  landing_page_id?: string | null;
  variant_id?: string | null;
}

export interface LandingVariantContent {
  heroHeadline?: string;
  heroSubheadline?: string;
  ctaText?: string;
  heroImageUrl?: string;
  /** Single brand hex color (e.g. "#B8860B") — the rest of the palette (dark/hover/tints)
   * is derived automatically, see lib/theme.ts. */
  accentColor?: string;
  /** Swaps every "Russian manicure" branding mention across the page for "European manicure"
   * wording — a terminology/branding test, not a different technique: absent or "russian" is
   * today's default copy. See data/designCopy.ts's terminologize(). */
  terminology?: "russian" | "european";
  /** Selects an entirely different marketing-content template instead of a content override on
   * the classic layout — "precision" and "editorial" are the 2 new mobile-first A/B designs
   * (see LandingPage.tsx's template branch, ManiPrecisionTemplate.tsx / ManiEditorialTemplate.tsx).
   * Absent means the classic template, unchanged. Both new templates still render the identical
   * shared booking funnel (BookingModalProvider/BookingModal/useBookingModal) — only the marketing
   * content around it differs. */
  template?: "precision" | "editorial";
  /** Where the booking modal collects contact info (name/phone/email): "start" (today's default,
   * step 1 of 4) or "end" (right before Confirm, after services + date/time are picked) — see
   * lib/funnelFlow.ts's BOOKING_FLOWS. Absent means "start", so every variant that doesn't set
   * this explicitly keeps today's exact behavior. */
  contactStepPosition?: "start" | "end";
  /** Which service starts pre-selected (checked) in the booking modal's Step 2 cart —
   * absent/"manicure" is today's default. The other service is never hidden or forced off,
   * just not pre-checked — a visitor can still add it (e.g. a pedicure-ad visitor who also
   * wants a manicure combo isn't blocked from adding one). */
  defaultService?: "manicure" | "pedicure";
  /** When present, and the visitor's utm_campaign looks pedicure-targeted (case-insensitive
   * "pedi" substring — matches both "...pedi" and "...pedicure" ad-naming conventions seen in
   * real campaigns, e.g. "Сайт 14.07pedi" and "27.07pedicure video"), these fields are merged
   * over this variant's own content and defaultService is forced to "pedicure" — purely
   * client-side, see lib/experiments.ts's isPedicureTraffic(). Lets one variant serve as a
   * manicure-default control for regular traffic and a pedicure-focused pitch for pedi-tagged
   * ad traffic, without needing a separate ?v= deep link per campaign. */
  pedicureOverride?: {
    heroHeadline?: string;
    heroSubheadline?: string;
    ctaText?: string;
    heroImageUrl?: string;
  };
}

export interface LandingVariant {
  id: string;
  name: string;
  weight: number;
  content: LandingVariantContent;
}

export interface ExperimentResolution {
  landing_page_id: string | null;
  experiment_status: "active" | "paused" | "none";
  variants: LandingVariant[];
}

export type TrackingEventType = "page_view" | "click" | "booking_started" | "booking_completed";

export interface BookingSegmentSelection {
  service_slug: string;
  service_variation_id: string;
  service_variation_version: number;
}

export interface BookingSlotSelection {
  start_at: string;
  team_member_id: string;
  segments: BookingSegmentSelection[];
}

// The promo/exp/sig query params the page loaded with — see useRebookingPromo. Passed through
// verbatim on booking submission; the backend re-verifies the signature independently.
export interface PromoAttempt {
  code: string;
  exp_epoch_seconds: number;
  signature: string;
}

export interface PromoVerifyResponse {
  valid: boolean;
  discount_amount: number | null;
  min_spend: number | null;
}

export interface BookingRequest {
  slot: BookingSlotSelection;
  customer: CustomerContact;
  note?: string | null;
  sms_opt_in: boolean;
  tracking?: TrackingSnapshot | null;
  promo?: PromoAttempt | null;
  // Abuse-guard fields — see the booking modal's honeypot field / form-open timestamp / Turnstile widget.
  website?: string | null;
  form_rendered_at?: string | null;
  turnstile_token?: string | null;
}

export interface BookingConfirmation {
  booking_id: string;
  status: string;
  start_at: string;
  duration_minutes: number;
  service_name: string;
  tier: ArtistTier;
  artist_name: string | null;
  price: number;
  compare_at_price: number | null;
  location_name: string;
  location_address: string;
  location_phone: string | null;
  cancellation_policy_text: string | null;
}

export interface FourHandRequestSubmission {
  slot: BookingSlotSelection;
  customer: CustomerContact;
  requested_services?: string | null;
  note?: string | null;
  tracking?: TrackingSnapshot | null;
  // Abuse-guard fields — see BookingRequest.
  website?: string | null;
  form_rendered_at?: string | null;
  turnstile_token?: string | null;
}

export interface FourHandRequestConfirmation {
  booking_id: string;
  status: string;
  service_name: string;
  message: string;
}

export const ANY_ARTIST = "any" as const;
