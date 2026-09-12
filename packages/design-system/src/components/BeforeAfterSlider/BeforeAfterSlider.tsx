import { useCallback, useRef, useState } from "react";
import "./BeforeAfterSlider.css";

export interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Starting split position, 0-100. Defaults to 50 (even split). */
  initialPosition?: number;
}

/** A draggable before/after comparison — built for the acrylic-vs-Russian-gel centerpiece in
 * the redesign brief. Both images are stacked full-bleed and the "after" layer is revealed with
 * `clip-path` driven by drag position — deliberately not a width-shrinking wrapper (the more
 * common naive implementation), since that approach requires measuring the container in JS to
 * size the inner image correctly and drifts out of sync on resize; clip-path needs no
 * measurement at all and can't desync. Plain Pointer Events (mouse, touch, and pen in one
 * handler) — no slider library for one interaction. Keyboard-operable via arrow keys. */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Acrylic",
  afterLabel = "Russian Gel Overlay",
  initialPosition = 50,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(initialPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5));
    if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5));
  };

  return (
    <div
      className="ds-before-after"
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <img className="ds-before-after__image" src={beforeSrc} alt={beforeLabel} draggable={false} />
      <img
        className="ds-before-after__image ds-before-after__image--after"
        src={afterSrc}
        alt={afterLabel}
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      <div className="ds-before-after__label ds-before-after__label--before">{beforeLabel}</div>
      <div className="ds-before-after__label ds-before-after__label--after">{afterLabel}</div>

      <div
        className="ds-before-after__handle"
        style={{ left: `${position}%` }}
        role="slider"
        tabIndex={0}
        aria-label={`Comparison: ${beforeLabel} vs ${afterLabel}`}
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={onKeyDown}
      >
        <div className="ds-before-after__handle-grip">&#8596;</div>
      </div>
    </div>
  );
}
