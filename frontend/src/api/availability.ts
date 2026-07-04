import { apiGet } from "@/api/client";
import type { AvailabilityResponse } from "@/types/api";

export function fetchAvailability(params: {
  services: string[];
  artist: string;
  days?: number;
}): Promise<AvailabilityResponse> {
  const search = new URLSearchParams({
    services: params.services.join(","),
    artist: params.artist,
    ...(params.days ? { days: String(params.days) } : {}),
  });
  return apiGet<AvailabilityResponse>(`/api/availability?${search.toString()}`);
}
