import type { CSSProperties } from "react";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";
import { useCartMenu } from "@/features/landing/CartMenuContext";
import { formatPrice } from "@/lib/formatting";

export function StickyBottomBar() {
  const { open } = useBookingModalContext();
  const { cartMenu } = useCartMenu();
  if (!cartMenu) return null;

  const top = cartMenu.manicure.pricing.find((p) => p.tier === "top") ?? cartMenu.manicure.pricing[0];

  return (
    <div style={styles.bar}>
      <div style={{ lineHeight: 1.15 }}>
        <div style={styles.priceOld}>{formatPrice(top.compare_at_price ?? top.price)}</div>
        <div style={styles.priceNew}>
          {formatPrice(top.price)} <span style={styles.firstVisit}>first visit</span>
        </div>
      </div>
      <button onClick={open} style={styles.ctaButton}>
        Book Your Appointment
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  bar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 45,
    maxWidth: "var(--max-width)",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 16px",
    background: "rgba(255,253,251,0.94)",
    backdropFilter: "blur(12px)",
    borderTop: "1px solid var(--color-border)",
  },
  priceOld: { fontSize: 11, color: "var(--color-muted-2)", textDecoration: "line-through" },
  priceNew: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--color-ink)" },
  firstVisit: { fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--color-accent)" },
  ctaButton: {
    flex: 1,
    border: "none",
    background: "var(--color-accent)",
    color: "#fff7f3",
    fontSize: 15,
    fontWeight: 600,
    padding: 14,
    borderRadius: 11,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(158,90,99,0.3)",
  },
};
