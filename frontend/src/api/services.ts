import { apiGet } from "@/api/client";
import type { CartMenu } from "@/types/api";

export function fetchCartMenu(): Promise<CartMenu> {
  return apiGet<CartMenu>("/api/services");
}
