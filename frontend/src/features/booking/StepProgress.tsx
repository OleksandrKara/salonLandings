import type { CSSProperties } from "react";

interface StepProgressProps {
  current: number;
  total: number;
  /** Overrides the whole indicator with plain text — used only for a flow's very first step,
   * where a visible step count reads as "this'll take a while" before the visitor has seen any
   * value yet. Every later step shows the real segmented bar instead: once someone's already
   * invested a step, a visible "almost there" reads as encouraging, not discouraging (the
   * goal-gradient effect — motivation rises as the finish line gets closer). */
  overrideLabel?: string;
}

export function StepProgress({ current, total, overrideLabel }: StepProgressProps) {
  if (overrideLabel) {
    return <div style={styles.overrideLabel}>{overrideLabel}</div>;
  }
  return (
    <div style={styles.wrap} aria-label={`Step ${current} of ${total}`}>
      <div style={styles.segments}>
        {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
          <span
            key={step}
            style={{
              ...styles.segment,
              background: step <= current ? "var(--color-accent)" : "var(--color-border-2)",
            }}
          />
        ))}
      </div>
      <span style={styles.text}>
        Step {current} of {total}
      </span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { display: "flex", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 2 },
  segments: { display: "flex", gap: 4, flex: 1 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  text: {
    flex: "none",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "var(--color-accent)",
    whiteSpace: "nowrap",
  },
  overrideLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "var(--color-accent)",
    fontWeight: 600,
    marginTop: 10,
  },
};
