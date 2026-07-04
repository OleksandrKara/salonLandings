import type { CSSProperties } from "react";
import mani1 from "@/assets/mani1.jpg";
import { CREDIBILITY_STATS, HEADLINE, SUBHEAD } from "@/data/designCopy";
import { useBookingModalContext } from "@/features/booking/BookingModalContext";
import { useCartMenu } from "@/features/landing/CartMenuContext";
import { GoogleLogo } from "@/features/landing/GoogleLogo";
import { formatPrice } from "@/lib/formatting";
import { ErrorNotice } from "@/features/landing/ErrorNotice";
import { Spinner } from "@/features/landing/Spinner";
import type { LandingVariantContent } from "@/types/api";

export function Hero({ overrides }: { overrides?: LandingVariantContent }) {
  const { open } = useBookingModalContext();
  const { status, cartMenu, error, retry } = useCartMenu();

  function scrollToResults() {
    const el = document.getElementById("results");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 60, behavior: "smooth" });
  }

  return (
    <section style={styles.section}>
      <div style={styles.imageWrap}>
        <img src={overrides?.heroImageUrl ?? mani1} alt="Russian hard-gel manicure close-up" style={styles.image} />
        <div style={styles.imageGradient} />
        <div style={styles.ratingBadge}>
          <GoogleLogo size={20} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)" }}>4.7</span>
          <span style={{ color: "var(--color-gold)", fontSize: 13, letterSpacing: 1 }}>★★★★★</span>
          <span style={{ fontSize: 12, color: "var(--color-muted-2)", fontWeight: 500 }}>113 reviews</span>
        </div>
      </div>

      <div style={{ paddingTop: 20 }}>
        <div style={styles.eyebrow}>Downtown San Diego · First-Visit Offer</div>
        <h1 style={styles.headline}>{overrides?.heroHeadline ?? HEADLINE}</h1>
        <p style={styles.subhead}>{overrides?.heroSubheadline ?? SUBHEAD}</p>

        <div style={styles.credStrip}>
          {CREDIBILITY_STATS.map((stat, i) => (
            <div key={stat.label} style={{ ...styles.credItem, borderLeft: i > 0 ? "1px solid var(--color-border)" : undefined }}>
              <div style={styles.credValue}>{stat.value}</div>
              <div style={styles.credLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {status === "loading" ? <Spinner label="Loading offer…" /> : null}
        {status === "error" ? <ErrorNotice message={error ?? "Something went wrong."} onRetry={retry} /> : null}
        {status === "success" && cartMenu ? (
          <PriceBlock priceOld={priceOf(cartMenu, true)} priceNew={priceOf(cartMenu, false)} />
        ) : null}

        <button onClick={open} style={styles.primaryButton}>
          {overrides?.ctaText ?? "Book Your Appointment"}
        </button>
        <button onClick={scrollToResults} style={styles.secondaryButton}>
          See Nail Results
        </button>

        <div style={styles.guaranteeBanner}>
          <span style={{ fontSize: 22, flex: "none" }}>🛡️</span>
          <div style={{ lineHeight: 1.35 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 14, color: "var(--color-success)" }}>
              2-Week Satisfaction Guarantee
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: "#4f6b5a" }}>
              Love your nails or we fix them free within 14 days.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function priceOf(cartMenu: ReturnType<typeof useCartMenu>["cartMenu"], compareAt: boolean): number {
  const top = cartMenu!.manicure.pricing.find((p) => p.tier === "top") ?? cartMenu!.manicure.pricing[0];
  return compareAt ? top.compare_at_price ?? top.price : top.price;
}

function PriceBlock({ priceOld, priceNew }: { priceOld: number; priceNew: number }) {
  const savingsPct = priceOld > priceNew ? Math.round((1 - priceNew / priceOld) * 100) : 0;

  return (
    <div style={styles.priceBlock}>
      {savingsPct > 0 ? <div style={styles.offerBadge}>{savingsPct}% OFF</div> : null}
      <div style={styles.priceRow}>
        <span style={styles.priceOld}>{formatPrice(priceOld)}</span>
        <span style={styles.arrow}>&rarr;</span>
        <span style={styles.priceNew}>{formatPrice(priceNew)}</span>
      </div>
      <div style={styles.offerNote}>First visit</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "22px 22px 8px" },
  imageWrap: { position: "relative", borderRadius: 18, overflow: "hidden" },
  image: { display: "block", width: "100%", height: "clamp(300px, 66vw, 420px)", objectFit: "cover" },
  imageGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "56%", background: "linear-gradient(to top, rgba(38,24,20,0.68), rgba(38,24,20,0))", pointerEvents: "none" },
  ratingBadge: { position: "absolute", left: 12, bottom: 12, display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.96)", borderRadius: 11, padding: "8px 11px", boxShadow: "0 4px 14px rgba(38,24,20,0.28)" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 },
  headline: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(34px, 9vw, 46px)", lineHeight: 1.04, margin: "12px 0 0", letterSpacing: -0.2 },
  subhead: { fontSize: 16, lineHeight: 1.5, color: "var(--color-muted)", margin: "14px 0 0" },
  credStrip: { display: "flex", alignItems: "stretch", marginTop: 18, border: "1px solid var(--color-border)", borderRadius: 13, overflow: "hidden", background: "var(--color-card)" },
  credItem: { flex: 1, padding: "12px 6px", textAlign: "center" },
  credValue: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, color: "var(--color-ink)" },
  credLabel: { fontSize: 10.5, color: "var(--color-muted-2)", marginTop: 2, letterSpacing: 0.2 },
  priceBlock: {
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 10,
    marginTop: 22,
    padding: "14px 16px",
    background: "var(--color-accent-tint-2)",
    border: "1px solid var(--color-border)",
    borderRadius: 14,
    overflow: "hidden",
  },
  offerBadge: {
    flex: "none",
    background: "var(--color-accent)",
    color: "#fff7f3",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.3,
    padding: "6px 10px",
    borderRadius: 8,
    whiteSpace: "nowrap",
  },
  priceRow: { flex: "none", display: "flex", alignItems: "baseline", gap: 7 },
  priceOld: { fontSize: 15, color: "var(--color-muted-3)", textDecoration: "line-through" },
  arrow: { fontSize: 15, color: "#b9a89f" },
  priceNew: { fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 28, lineHeight: 1, color: "var(--color-ink)" },
  offerNote: {
    flex: "1 1 auto",
    minWidth: 0,
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-ink-soft)",
  },
  primaryButton: { width: "100%", marginTop: 16, border: "none", background: "var(--color-accent)", color: "#fff7f3", fontSize: 16, fontWeight: 600, letterSpacing: 0.3, padding: 17, borderRadius: 12, cursor: "pointer", boxShadow: "0 8px 22px rgba(158,90,99,0.28)" },
  secondaryButton: { width: "100%", marginTop: 10, border: "1px solid #d9c7bd", background: "transparent", color: "var(--color-ink)", fontSize: 15, fontWeight: 500, padding: 15, borderRadius: 12, cursor: "pointer" },
  guaranteeBanner: { display: "flex", alignItems: "center", gap: 11, marginTop: 14, padding: "13px 15px", border: "1.5px solid #cfe4d6", borderRadius: 12, background: "var(--color-success-bg)" },
};
