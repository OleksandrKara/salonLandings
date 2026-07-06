import { useState, type CSSProperties } from "react";
import { MORE_REVIEWS, REVIEWS, terminologize, type Review } from "@/data/designCopy";
import { GoogleLogo } from "@/features/landing/GoogleLogo";
import type { LandingVariantContent } from "@/types/api";

export function GoogleReviews({ terminology }: { terminology?: LandingVariantContent["terminology"] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section style={styles.section}>
      <div style={styles.eyebrow}>Loved by locals</div>

      <div style={styles.summaryCard}>
        <GoogleLogo size={34} />
        <div style={{ flex: 1, lineHeight: 1.15 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 30, color: "var(--color-ink)" }}>4.7</span>
            <span style={{ color: "var(--color-gold)", fontSize: 16, letterSpacing: 1 }}>★★★★★</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-muted-2)", marginTop: 3 }}>Based on 113 Google reviews</div>
        </div>
        <span style={styles.verifiedBadge}>✓ Verified</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {REVIEWS.map((review) => (
          <ReviewCard key={review.name} review={review} terminology={terminology} />
        ))}
        {expanded
          ? MORE_REVIEWS.map((review) => <ReviewCard key={review.name} review={review} terminology={terminology} />)
          : null}
      </div>

      <button onClick={() => setExpanded((e) => !e)} style={styles.toggleButton}>
        {expanded ? "Show fewer reviews" : "Show more reviews"}
      </button>
    </section>
  );
}

function ReviewCard({ review, terminology }: { review: Review; terminology?: LandingVariantContent["terminology"] }) {
  return (
    <div style={styles.reviewCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
        <span style={styles.avatar}>{review.initial}</span>
        <span style={{ flex: 1, lineHeight: 1.2 }}>
          <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "var(--color-ink)" }}>{review.name}</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--color-muted-3)" }}>{review.date}</span>
        </span>
        <span style={{ flex: "none", color: "var(--color-gold)", fontSize: 13, letterSpacing: 0.5 }}>{review.stars}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--color-ink-soft)" }}>
        {terminologize(review.text, terminology)}
      </p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "44px 22px 8px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 },
  summaryCard: { display: "flex", alignItems: "center", gap: 14, margin: "16px 0 20px", padding: "16px 18px", border: "1px solid var(--color-border-2)", borderRadius: 14, background: "var(--color-card)" },
  verifiedBadge: { flex: "none", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-success)", background: "var(--color-success-bg-2)", borderRadius: 20, padding: "7px 11px" },
  reviewCard: { padding: "16px 17px", border: "1px solid var(--color-border-2)", borderRadius: 14, background: "var(--color-card)" },
  avatar: { flex: "none", width: 36, height: 36, borderRadius: "50%", background: "#f0e2dc", color: "var(--color-accent)", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  toggleButton: { width: "100%", marginTop: 12, border: "1px solid #d9c7bd", background: "transparent", color: "var(--color-accent)", fontSize: 14, fontWeight: 600, padding: 13, borderRadius: 11, cursor: "pointer" },
};
