import type { CSSProperties } from "react";
import logo from "@/assets/pmu/ak-logo-wide.png";
import { PMU_LOCATION, PMU_RATING } from "@/data/pmuCopy";

export function PmuFooter() {
  return (
    <footer style={styles.footer}>
      <img src={logo} alt={PMU_LOCATION.name} style={styles.logo} />
      <div style={{ marginTop: 6 }}>{PMU_LOCATION.address}</div>
      <div>By appointment</div>
      <div>
        ★ {PMU_RATING.score} · {PMU_RATING.count} Google reviews
      </div>
      <div style={styles.disclaimer}>Results vary by individual · Not medical advice · Consultation required before any procedure</div>
      {/* Both pages exist (frontend/public/privacy-policy, /terms — proper SMS/STOP/HELP language
          already written) but were never linked from the live site itself. A Twilio toll-free
          verification reviewer checks the *visible* site for a linked Privacy Policy/Terms, not
          for a URL that happens to resolve if guessed — an unlinked page reads as "doesn't exist"
          to them. akluxnails-home's own approved toll-free number links both from its footer the
          same way; this mirrors that. */}
      <nav style={styles.legalNav}>
        <a href="/privacy-policy" style={styles.legalLink}>Privacy Policy</a>
        <span aria-hidden style={styles.legalDivider}>·</span>
        <a href="/terms" style={styles.legalLink}>Terms &amp; SMS Program</a>
      </nav>
    </footer>
  );
}

const styles: Record<string, CSSProperties> = {
  footer: { padding: "24px 22px 34px", textAlign: "center", color: "#9a8b81", fontSize: 12.5, lineHeight: 1.7 },
  logo: { height: 56, width: "auto", display: "inline-block", marginBottom: 4 },
  disclaimer: { marginTop: 12, fontSize: 11, color: "#b3a49a" },
  legalNav: { marginTop: 14, fontSize: 11.5 },
  legalLink: { color: "var(--color-accent)", textDecoration: "underline", textUnderlineOffset: 2 },
  legalDivider: { margin: "0 8px", color: "#c9bab0" },
};
