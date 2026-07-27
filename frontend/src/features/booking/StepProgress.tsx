import type { CSSProperties } from "react";

interface StepProgressProps {
  current: number;
  total: number;
}

export function StepProgress({ current, total }: StepProgressProps) {
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
};
