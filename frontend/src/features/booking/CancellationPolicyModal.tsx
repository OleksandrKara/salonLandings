import type { CSSProperties } from "react";
import { CANCELLATION_POLICY_TEXT } from "@/data/designCopy";

export function CancellationPolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={styles.overlay}>
      <div onClick={(e) => e.stopPropagation()} style={styles.sheet}>
        <div style={styles.grabberRow}>
          <div style={styles.grabber} />
          <button onClick={onClose} style={styles.closeButton} aria-label="Close">
            ×
          </button>
        </div>
        <h3 style={styles.title}>Cancellation &amp; Service Policy</h3>
        <p style={styles.body}>{CANCELLATION_POLICY_TEXT}</p>
        <button onClick={onClose} style={styles.gotItButton}>
          Got it
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 70,
    background: "rgba(30,18,14,0.55)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    animation: "fadeIn 0.2s ease",
  },
  sheet: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    background: "var(--color-card)",
    borderRadius: "22px 22px 0 0",
    padding: "20px 22px 30px",
    animation: "sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)",
    maxHeight: "88vh",
    overflowY: "auto",
  },
  grabberRow: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 24, marginBottom: 10 },
  grabber: { width: 38, height: 4, borderRadius: 2, background: "#e3d3ca" },
  closeButton: { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#f4ece7", border: "none", borderRadius: "50%", fontSize: 20, color: "var(--color-muted-2)", cursor: "pointer", lineHeight: 1, padding: 0 },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 25, margin: "4px 0 6px", color: "var(--color-ink)" },
  body: { fontSize: 13, color: "var(--color-muted)", lineHeight: 1.6, margin: "0 0 18px", whiteSpace: "pre-line" },
  gotItButton: { width: "100%", border: "none", background: "var(--color-ink)", color: "#f6ece6", fontSize: 15, fontWeight: 600, padding: 15, borderRadius: 12, cursor: "pointer" },
};
