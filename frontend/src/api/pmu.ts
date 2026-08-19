import { apiGet, apiPost } from "@/api/client";
import type {
  PmuAvailabilityResponse,
  PmuCatalogResponse,
  PmuConsultationConfirmation,
  PmuConsultationRequest,
  PmuDepositBookingConfirmation,
  PmuDepositBookingRequest,
} from "@/types/pmu";

export function getPmuCatalog(): Promise<PmuCatalogResponse> {
  return apiGet<PmuCatalogResponse>("/api/pmu/catalog");
}

export function getPmuTechniqueAvailability(techniqueSlug: string, days?: number): Promise<PmuAvailabilityResponse> {
  const qs = days ? `?days=${days}` : "";
  return apiGet<PmuAvailabilityResponse>(`/api/pmu/availability/technique/${techniqueSlug}${qs}`);
}

export function getPmuConsultationAvailability(consultationSlug: string, days?: number): Promise<PmuAvailabilityResponse> {
  const qs = days ? `?days=${days}` : "";
  return apiGet<PmuAvailabilityResponse>(`/api/pmu/availability/consultation/${consultationSlug}${qs}`);
}

export function bookPmuConsultation(request: PmuConsultationRequest): Promise<PmuConsultationConfirmation> {
  return apiPost<PmuConsultationConfirmation>("/api/pmu/bookings/consultation", request);
}

export function bookPmuDeposit(request: PmuDepositBookingRequest): Promise<PmuDepositBookingConfirmation> {
  return apiPost<PmuDepositBookingConfirmation>("/api/pmu/bookings/deposit", request);
}
