import { useRef, useState, type CSSProperties } from "react";
import { CAROUSEL_INITIAL_COUNT, CAROUSEL_SLIDES, terminologize } from "@/data/designCopy";
import type { LandingVariantContent } from "@/types/api";

export function ResultsCarousel({ terminology }: { terminology?: LandingVariantContent["terminology"] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  // Only the first CAROUSEL_INITIAL_COUNT photos mount (and download) on page load — this is a
  // paid-ads landing page, so the rest stay out of the DOM entirely (not just lazy-loaded) until
  // the visitor taps "See More Photos", guaranteeing zero network cost for them until requested.
  const [expanded, setExpanded] = useState(false);
  const visibleSlides = expanded ? CAROUSEL_SLIDES : CAROUSEL_SLIDES.slice(0, CAROUSEL_INITIAL_COUNT);
  const hiddenCount = CAROUSEL_SLIDES.length - CAROUSEL_INITIAL_COUNT;

  function scrollToSlide(i: number) {
    setSlideIdx(i);
    const track = trackRef.current;
    if (track) {
      const step = track.clientWidth * 0.82 + 14;
      track.scrollTo({ left: i * step, behavior: "smooth" });
    }
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    const idx = Math.round(track.scrollLeft / (width * 0.82 + 14));
    const clamped = Math.max(0, Math.min(visibleSlides.length - 1, idx));
    if (clamped !== slideIdx) setSlideIdx(clamped);
  }

  return (
    <section id="results" style={styles.section}>
      <div style={{ padding: "0 22px" }}>
        <div style={styles.eyebrow}>The Results</div>
        <h2 style={styles.title}>Exactly what you clicked for.</h2>
        <p style={styles.subtitle}>Real hard-gel finishes. Swipe through — tap any photo to enlarge.</p>
      </div>

      <div ref={trackRef} onScroll={onScroll} style={styles.track}>
        {visibleSlides.map((slide, i) => (
          <div key={slide.id} style={styles.slide}>
            <div style={styles.slideImageWrap}>
              <img
                src={slide.src}
                alt={terminologize(slide.caption, terminology)}
                style={styles.slideImage}
                loading="lazy"
                decoding="async"
              />
              <span style={styles.slideBadge}>{slide.badge}</span>
              <button onClick={() => setLightboxIdx(i)} title="Enlarge" style={styles.zoomButton}>
                🔍
              </button>
            </div>
            <div style={styles.slideCaption}>{terminologize(slide.caption, terminology)}</div>
            <div style={styles.slideSub}>{slide.sub}</div>
          </div>
        ))}
        {!expanded && hiddenCount > 0 ? (
          <div style={styles.slide}>
            <button onClick={() => setExpanded(true)} style={styles.seeMoreCard}>
              <span style={{ fontSize: 28 }}>+{hiddenCount}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>See More Photos</span>
            </button>
          </div>
        ) : null}
      </div>

      <div style={styles.dotsRow}>
        <button onClick={() => scrollToSlide(Math.max(0, slideIdx - 1))} style={styles.arrowButton}>
          ‹
        </button>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {visibleSlides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => scrollToSlide(i)}
              style={{
                width: i === slideIdx ? 22 : 8,
                height: 8,
                borderRadius: 20,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: i === slideIdx ? "var(--color-accent)" : "#e0cabf",
                transition: "all 0.25s",
              }}
            />
          ))}
        </div>
        <button
          onClick={() => scrollToSlide(Math.min(visibleSlides.length - (expanded || hiddenCount === 0 ? 1 : 0), slideIdx + 1))}
          style={styles.arrowButton}
        >
          ›
        </button>
      </div>

      {lightboxIdx !== null ? (
        <Lightbox
          index={lightboxIdx}
          terminology={terminology}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i! - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
          onNext={() => setLightboxIdx((i) => (i! + 1) % CAROUSEL_SLIDES.length)}
        />
      ) : null}
    </section>
  );
}

function Lightbox({
  index,
  terminology,
  onClose,
  onPrev,
  onNext,
}: {
  index: number;
  terminology?: LandingVariantContent["terminology"];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const slide = CAROUSEL_SLIDES[index];
  const caption = terminologize(slide.caption, terminology);
  return (
    <div onClick={onClose} style={styles.lightboxOverlay}>
      <button onClick={onClose} style={{ ...styles.lightboxNav, top: 18, right: 18, transform: "none" }}>
        ×
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        style={{ ...styles.lightboxNav, left: 10, top: "50%", transform: "translateY(-50%)" }}
      >
        ‹
      </button>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <img src={slide.src} alt={caption} style={styles.lightboxImage} />
        <div style={{ color: "#f3e2da", fontSize: 14, fontWeight: 600, marginTop: 14 }}>{slide.badge}</div>
        <div style={{ color: "#c9b7ac", fontSize: 13, marginTop: 3 }}>{caption}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        style={{ ...styles.lightboxNav, right: 10, top: "50%", transform: "translateY(-50%)" }}
      >
        ›
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  section: { padding: "44px 0 8px" },
  eyebrow: { fontSize: 11.5, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 30, margin: "8px 0 4px", letterSpacing: -0.2 },
  subtitle: { fontSize: 14, color: "var(--color-muted-2)", margin: "0 0 18px" },
  track: { display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", padding: "0 22px 6px", scrollbarWidth: "none" },
  slide: { flex: "0 0 82%", scrollSnapAlign: "center", maxWidth: 420 },
  slideImageWrap: { position: "relative", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 30px rgba(90,50,40,0.12)" },
  slideImage: { display: "block", width: "100%", height: "clamp(300px, 80vw, 420px)", objectFit: "cover" },
  slideBadge: { position: "absolute", top: 12, left: 12, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--color-accent)", background: "rgba(255,253,251,0.92)", padding: "5px 11px", borderRadius: 20 },
  zoomButton: { position: "absolute", bottom: 12, right: 12, width: 38, height: 38, border: "none", borderRadius: "50%", background: "rgba(42,33,29,0.62)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", padding: 0, fontSize: 14 },
  slideCaption: { fontSize: 13, color: "var(--color-ink-soft)", fontWeight: 500, marginTop: 10, padding: "0 4px", lineHeight: 1.35 },
  slideSub: { fontSize: 12, color: "var(--color-muted-2)", padding: "0 4px", lineHeight: 1.35 },
  seeMoreCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: "clamp(300px, 80vw, 420px)",
    border: "1.5px dashed #d9c7bd",
    borderRadius: 18,
    background: "var(--color-accent-tint-2)",
    color: "var(--color-accent)",
    cursor: "pointer",
  },
  dotsRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 14, padding: "0 22px" },
  arrowButton: { width: 38, height: 38, flex: "none", borderRadius: "50%", border: "1px solid #d9c7bd", background: "#fff", color: "var(--color-accent)", fontSize: 17, cursor: "pointer", lineHeight: 1, padding: 0 },
  lightboxOverlay: { position: "fixed", inset: 0, zIndex: 70, background: "rgba(28,18,14,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.2s ease" },
  lightboxNav: { position: "absolute", width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 },
  lightboxImage: { width: "100%", maxHeight: "74vh", objectFit: "contain", borderRadius: 14 },
};
