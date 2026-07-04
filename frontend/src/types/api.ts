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
  email_address: string;
  phone_number: string;
  marketing_opt_in: boolean;
}

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

export interface BookingRequest {
  slot: BookingSlotSelection;
  customer: CustomerContact;
  note?: string | null;
  sms_opt_in: boolean;
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
  customer: CustomerContact;
  requested_services?: string | null;
  note?: string | null;
}

export interface FourHandRequestConfirmation {
  booking_id: string;
  status: string;
  service_name: string;
  message: string;
}

export const ANY_ARTIST = "any" as const;
