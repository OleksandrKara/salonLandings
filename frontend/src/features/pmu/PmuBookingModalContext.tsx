import { createContext, useContext, useState, type ReactNode } from "react";
import type { PromoAttempt } from "@/types/api";

export type PmuModalMode =
  | { kind: "consultation"; consultationSlug: string }
  | { kind: "deposit"; techniqueSlug: string }
  | null;

interface PmuBookingModalContextValue {
  mode: PmuModalMode;
  openConsultation: (consultationSlug?: string) => void;
  openDeposit: (techniqueSlug: string) => void;
  close: () => void;
  // The page's own verified rebooking-promo attempt, if any — see useRebookingPromo. Only the
  // deposit booking flow (a real paid booking) sends this through; see PmuBookingModal.
  promoAttempt: PromoAttempt | null;
}

const PmuBookingModalContext = createContext<PmuBookingModalContextValue | null>(null);

export function PmuBookingModalProvider({
  children,
  promoAttempt = null,
}: {
  children: ReactNode;
  promoAttempt?: PromoAttempt | null;
}) {
  const [mode, setMode] = useState<PmuModalMode>(null);

  const value: PmuBookingModalContextValue = {
    mode,
    openConsultation: (consultationSlug = "online-consultation") => setMode({ kind: "consultation", consultationSlug }),
    openDeposit: (techniqueSlug) => setMode({ kind: "deposit", techniqueSlug }),
    close: () => setMode(null),
    promoAttempt,
  };

  return <PmuBookingModalContext.Provider value={value}>{children}</PmuBookingModalContext.Provider>;
}

export function usePmuBookingModalContext(): PmuBookingModalContextValue {
  const ctx = useContext(PmuBookingModalContext);
  if (!ctx) throw new Error("usePmuBookingModalContext must be used within PmuBookingModalProvider");
  return ctx;
}
