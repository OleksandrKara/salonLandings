import { createContext, useContext, type ReactNode } from "react";
import { useBookingModal } from "@/features/booking/useBookingModal";

type BookingModalContextValue = ReturnType<typeof useBookingModal>;

const BookingModalContext = createContext<BookingModalContextValue | null>(null);

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const value = useBookingModal();
  return <BookingModalContext.Provider value={value}>{children}</BookingModalContext.Provider>;
}

export function useBookingModalContext(): BookingModalContextValue {
  const ctx = useContext(BookingModalContext);
  if (!ctx) throw new Error("useBookingModalContext must be used within BookingModalProvider");
  return ctx;
}
