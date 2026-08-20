import { useEffect, useState, type CSSProperties } from "react";
import { formatPrice } from "@/lib/formatting";
import type { RebookingPromoBannerState } from "@/lib/useRebookingPromo";

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Mobile-first promo banner for a same-day-rebooking/customer-winback coupon link — mirrors
 * akluxnails-home's own RebookingPromoBanner. Only ever rendered once useRebookingPromo has
 * already verified the link server-side, so this component itself does no verification. Ticks
 * client-side from the fixed expiresAtMs already resolved, no server round-trip for the countdown
 * itself. */
export function RebookingPromoBanner({ discountAmount, expiresAtMs }: RebookingPromoBannerState) {
  const [now, setNow] = useState(() => Date.now());
  const amount = formatPrice(discountAmount);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expired = now >= expiresAtMs;
  if (expired) return null;

  return (
    <div style={styles.banner} role="status">
      <span style={styles.text}>
        🎁 {amount} off your next visit if you book before it expires —{" "}
        <span style={styles.countdown}>{formatCountdown(expiresAtMs - now)}</span> left
      </span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  banner: {
    display: "flex",
    minHeight: 32,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    textAlign: "center",
    backgroundColor: "var(--color-accent)",
    color: "white",
  },
  text: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    fontWeight: 500,
  },
  countdown: { fontVariantNumeric: "tabular-nums" },
};
