import { useRef, useState, type CSSProperties } from "react";
import { GoogleLogo } from "@/features/landing/GoogleLogo";
import { PMU_RATING, PMU_REVIEWS, type PmuReview } from "@/data/pmuCopy";

const READ_MORE_THRESHOLD = 200;

/** Real Google reviews as a swipeable carousel, same design as the PMU site's own reviews block
 * (pmu-annakara-home ReviewCard/ReviewsCarousel): profile photo, name, exact date, Google mark,
 * stars, read-more, "Posted on Google". Deliberately no link out to Google (owner request
 * 2026-09-30: keep visitors on the booking page), and no self-applied "Verified" badge. */
export function PmuReviews() {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    track.scrollBy({ left: ((card?.offsetWidth ?? 280) + 12) * direction, behavior: "smooth" });
  }

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <GoogleLogo size={30} />
        <h2 style={styles.heading}>What Our Clients Say</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={styles.score}>{PMU_RATING.score}</span>
          <span style={styles.stars} aria-hidden>
            ★★★★★
          </span>
        </div>
        <div style={styles.basedOn}>Based on {PMU_RATING.count} Google reviews</div>
      </div>

      <div>
        <div ref={trackRef} style={styles.track} className="pmu-reviews-track">
          {PMU_REVIEWS.map((review) => (
            <div key={review.name + review.date} style={styles.slide}>
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
        {/* Below the cards, not over them: this page is a narrow single column at every width, so
            overlaid arrows would cover review text. */}
        <div style={styles.arrows}>
          <button type="button" aria-label="Previous reviews" onClick={() => scrollByCard(-1)} style={styles.arrow}>
            ‹
          </button>
          <button type="button" aria-label="Next reviews" onClick={() => scrollByCard(1)} style={styles.arrow}>
            ›
          </button>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: PmuReview }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > READ_MORE_THRESHOLD;
  const text = isLong && !expanded ? review.text.slice(0, READ_MORE_THRESHOLD).trimEnd() + "…" : review.text;

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {review.profileImage ? (
          <img src={review.profileImage} alt={`${review.name} profile picture`} width={40} height={40} loading="lazy" style={styles.avatarImg} />
        ) : (
          <span style={styles.avatar} aria-hidden>
            {review.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <span style={styles.name}>{review.name}</span>
          <span style={styles.date}>{review.date}</span>
        </span>
        <GoogleLogo size={18} />
      </div>
      <div style={styles.cardStars} aria-label="5 out of 5 stars">
        ★★★★★
      </div>
      <p style={styles.text}>
        {text}{" "}
        {isLong ? (
          <button type="button" onClick={() => setExpanded((v) => !v)} style={styles.readMore}>
            {expanded ? "Hide" : "Read more"}
          </button>
        ) : null}
      </p>
      <div style={styles.posted}>Posted on Google</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "44px 22px 8px" },
  header: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 20 },
  heading: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "8px 0 0", color: "var(--color-ink)" },
  score: { fontWeight: 700, fontSize: 20, color: "var(--color-ink)" },
  stars: { color: "#F4B400", fontSize: 16, letterSpacing: 1.5 },
  basedOn: { fontSize: 11.5, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--color-muted-2)", marginTop: 4, fontWeight: 600 },
  track: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    scrollPaddingLeft: 22,
    margin: "0 -22px",
    padding: "0 22px 6px",
    scrollbarWidth: "none",
  },
  slide: { flex: "none", width: "82%", maxWidth: 320, scrollSnapAlign: "start" },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "16px 17px",
    border: "1px solid var(--color-border-2)",
    borderRadius: 14,
    background: "var(--color-card)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  avatarImg: { flex: "none", width: 40, height: 40, borderRadius: "50%", objectFit: "cover", display: "block" },
  avatar: {
    flex: "none",
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "var(--color-accent)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { display: "block", fontWeight: 600, fontSize: 14, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  date: { display: "block", fontSize: 11.5, color: "var(--color-muted-3)" },
  cardStars: { color: "#F4B400", fontSize: 14, letterSpacing: 1.5, marginTop: 10 },
  text: { flex: 1, margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--color-ink-soft)", whiteSpace: "pre-line" },
  readMore: { border: "none", background: "none", padding: 0, color: "var(--color-accent)", fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  posted: { marginTop: 12, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--color-muted-3)", fontWeight: 600 },
  arrows: { display: "flex", justifyContent: "center", gap: 12, marginTop: 14 },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "1px solid var(--color-border-2)",
    background: "var(--color-card)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
    color: "var(--color-ink)",
    fontSize: 20,
    lineHeight: "30px",
    cursor: "pointer",
  },
};
