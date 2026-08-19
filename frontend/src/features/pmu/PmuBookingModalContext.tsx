import { createContext, useContext, useState, type ReactNode } from "react";

export type PmuModalMode =
  | { kind: "consultation"; consultationSlug: string }
  | { kind: "deposit"; techniqueSlug: string }
  | null;

interface PmuBookingModalContextValue {
  mode: PmuModalMode;
  openConsultation: (consultationSlug?: string) => void;
  openDeposit: (techniqueSlug: string) => void;
  close: () => void;
}

const PmuBookingModalContext = createContext<PmuBookingModalContextValue | null>(null);

export function PmuBookingModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PmuModalMode>(null);

  const value: PmuBookingModalContextValue = {
    mode,
    openConsultation: (consultationSlug = "online-consultation") => setMode({ kind: "consultation", consultationSlug }),
    openDeposit: (techniqueSlug) => setMode({ kind: "deposit", techniqueSlug }),
    close: () => setMode(null),
  };

  return <PmuBookingModalContext.Provider value={value}>{children}</PmuBookingModalContext.Provider>;
}

export function usePmuBookingModalContext(): PmuBookingModalContextValue {
  const ctx = useContext(PmuBookingModalContext);
  if (!ctx) throw new Error("usePmuBookingModalContext must be used within PmuBookingModalProvider");
  return ctx;
}
