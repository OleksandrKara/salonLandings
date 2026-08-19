import type { CustomerContact, TrackingSnapshot } from "@/types/api";

export interface PmuTechniqueOffer {
  slug: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  variation_id: string;
  variation_version: number;
}

export interface PmuConsultationOffer {
  slug: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  variation_id: string;
  variation_version: number;
  team_member_ids: string[];
}

export interface PmuCatalogResponse {
  techniques: PmuTechniqueOffer[];
  consultations: PmuConsultationOffer[];
  deposit_amount: number;
  square_application_id: string;
  square_location_id: string;
}

export interface PmuSlotOption {
  start_at: string;
  end_at: string;
  team_member_id: string;
  artist_name: string | null;
}

export interface PmuAvailabilityResponse {
  slots: PmuSlotOption[];
}

export interface PmuConsultationRequest {
  consultation_slug: string;
  team_member_id: string;
  start_at: string;
  customer: CustomerContact;
  note?: string | null;
  tracking?: TrackingSnapshot | null;
  website?: string | null;
  form_rendered_at?: string | null;
  turnstile_token?: string | null;
}

export interface PmuConsultationConfirmation {
  booking_id: string;
  status: string;
  start_at: string;
  service_name: string;
  artist_name: string | null;
}

export interface PmuDepositBookingRequest {
  technique_slug: string;
  team_member_id: string;
  start_at: string;
  customer: CustomerContact;
  source_id: string;
  note?: string | null;
  tracking?: TrackingSnapshot | null;
  website?: string | null;
  form_rendered_at?: string | null;
  turnstile_token?: string | null;
}

export interface PmuDepositBookingConfirmation {
  booking_id: string;
  status: string;
  start_at: string;
  duration_minutes: number;
  service_name: string;
  full_price: number;
  deposit_amount: number;
  remaining_balance: number;
  artist_name: string | null;
  payment_id: string;
}
