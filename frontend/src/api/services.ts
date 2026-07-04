import { apiGet } from "@/api/client";
import type { ServiceOffer } from "@/types/api";

export function fetchServiceOffers(): Promise<ServiceOffer[]> {
  return apiGet<ServiceOffer[]>("/api/services");
}

export function fetchServiceOffer(slug: string): Promise<ServiceOffer> {
  return apiGet<ServiceOffer>(`/api/services/${encodeURIComponent(slug)}`);
}
