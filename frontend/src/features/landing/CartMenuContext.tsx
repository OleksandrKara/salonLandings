import { createContext, useContext, type ReactNode } from "react";
import { fetchCartMenu } from "@/api/services";
import { useAsync } from "@/lib/useAsync";
import type { CartMenu } from "@/types/api";

interface CartMenuContextValue {
  status: "loading" | "success" | "error";
  cartMenu: CartMenu | null;
  error: string | null;
  retry: () => void;
}

const CartMenuContext = createContext<CartMenuContextValue | null>(null);

export function CartMenuProvider({ children }: { children: ReactNode }) {
  const { status, data, error, retry } = useAsync(fetchCartMenu, []);
  const value: CartMenuContextValue = { status, cartMenu: data, error, retry };
  return <CartMenuContext.Provider value={value}>{children}</CartMenuContext.Provider>;
}

export function useCartMenu(): CartMenuContextValue {
  const ctx = useContext(CartMenuContext);
  if (!ctx) throw new Error("useCartMenu must be used within CartMenuProvider");
  return ctx;
}
