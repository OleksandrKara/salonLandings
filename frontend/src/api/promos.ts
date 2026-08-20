import { apiGet } from "@/api/client";
import type { PromoVerifyResponse } from "@/types/api";

export function verifyRebookingPromo(code: string, expEpochSeconds: number, signature: string): Promise<PromoVerifyResponse> {
  const params = new URLSearchParams({ code, exp: String(expEpochSeconds), sig: signature });
  return apiGet<PromoVerifyResponse>(`/api/promos/verify?${params.toString()}`);
}
