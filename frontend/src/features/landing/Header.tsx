import type { CSSProperties } from "react";
import logo from "@/assets/logo.png";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";

export function Header() {
  const { open } = useBookingModalContext();
  return (
    <header style={styles.header}>
      <img src={logo} alt="AK.LUX.NAILS" style={styles.logo} />
      <button onClick={open} style={styles.bookButton}>
        Book
      </button>
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 20px",
    background: "rgba(255,253,251,0.88)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid var(--color-border)",
  },
  logo: { height: 30, width: "auto", display: "block" },
  bookButton: {
    border: "none",
    background: "var(--color-accent)",
    color: "#fff7f3",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.4,
    padding: "9px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },
};
