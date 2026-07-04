import { formatPrice } from "@/lib/formatting";
import styles from "./PriceTag.module.css";

interface PriceTagProps {
  price: number;
  compareAtPrice?: number | null;
  savingsLabel?: string;
  size?: "md" | "lg";
}

export function PriceTag({ price, compareAtPrice, savingsLabel, size = "md" }: PriceTagProps) {
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;

  return (
    <div className={[styles.wrapper, size === "lg" ? styles.lg : ""].join(" ")}>
      <span className={styles.price}>{formatPrice(price)}</span>
      {hasDiscount ? <span className={styles.compareAt}>{formatPrice(compareAtPrice!)}</span> : null}
      {savingsLabel ? <span className={styles.badge}>{savingsLabel}</span> : null}
    </div>
  );
}
