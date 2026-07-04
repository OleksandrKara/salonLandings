import { apiGet } from "@/api/client";
import type { Artist } from "@/types/api";

export function fetchArtists(): Promise<Artist[]> {
  return apiGet<Artist[]>("/api/artists");
}
