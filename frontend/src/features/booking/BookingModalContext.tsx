import { createContext, useContext, type ReactNode } from "react";
import { useBookingModal } from "@/features/booking/useBookingModal";
import type { ContactStepPosition } from "@/lib/funnelFlow";

type BookingModalContextValue = ReturnType<typeof useBookingModal>;

const BookingModalContext = createContext<BookingModalContextValue | null>(null);

export function BookingModalProvider({
  children,
  position = "start",
  defaultService = "manicure",
}: {
  children: ReactNode;
  position?: ContactStepPosition;
  defaultService?: "manicure" | "pedicure";
}) {
  const value = useBookingModal(position, defaultService);
  return <BookingModalContext.Provider value={value}>{children}</BookingModalContext.Provider>;
}

export function useBookingModalContext(): BookingModalContextValue {
  const ctx = useContext(BookingModalContext);
  if (!ctx) throw new Error("useBookingModalContext must be used within BookingModalProvider");
  return ctx;
}
