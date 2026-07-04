import { apiGet } from "@/api/client";
import type { AvailabilityResponse } from "@/types/api";

export function fetchAvailability(params: {
  service: string;
  artist: string;
  days?: number;
}): Promise<AvailabilityResponse> {
  const search = new URLSearchParams({
    service: params.service,
    artist: params.artist,
    ...(params.days ? { days: String(params.days) } : {}),
  });
  return apiGet<AvailabilityResponse>(`/api/availability?${search.toString()}`);
}
