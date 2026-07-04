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

export interface Artist {
  id: string;
  display_name: string;
  tier: ArtistTier;
  bio: string | null;
  photo_url: string | null;
}

export interface SlotOption {
  start_at: string;
  end_at: string;
  duration_minutes: number;
  service_variation_id: string;
  service_variation_version: number;
  team_member_id: string;
  artist_name: string | null;
  tier: ArtistTier;
  price: number;
  compare_at_price: number | null;
  advertised_price: number;
  savings: number;
  is_best_price: boolean;
}

export interface AvailabilityResponse {
  service_slug: string;
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

export interface BookingSlotSelection {
  service_slug: string;
  start_at: string;
  service_variation_id: string;
  service_variation_version: number;
  team_member_id: string;
}

export interface BookingRequest {
  slot: BookingSlotSelection;
  customer: CustomerContact;
  note?: string | null;
}

export interface BookingConfirmation {
  booking_id: string;
  status: string;
  start_at: string;
  service_name: string;
  tier: ArtistTier;
  artist_name: string | null;
  price: number;
  location_name: string;
  location_address: string;
  location_phone: string | null;
  cancellation_policy_text: string | null;
}

export const ANY_ARTIST = "any" as const;
