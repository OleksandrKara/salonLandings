import type { CSSProperties } from "react";
import logo from "@/assets/pmu/ak-logo-wide.png";
import { PMU_LOCATION, PMU_RATING } from "@/data/pmuCopy";

export function PmuFooter() {
  return (
    <footer style={styles.footer}>
      <img src={logo} alt={PMU_LOCATION.name} style={styles.logo} />
      <div style={{ marginTop: 6 }}>{PMU_LOCATION.address}</div>
      <div>{PMU_LOCATION.phone} · By appointment</div>
      <div>
        ★ {PMU_RATING.score} · {PMU_RATING.count} Google reviews
      </div>
      <div style={styles.disclaimer}>Results vary by individual · Not medical advice · Consultation required before any procedure</div>
    </footer>
  );
}

const styles: Record<string, CSSProperties> = {
  footer: { padding: "24px 22px 34px", textAlign: "center", color: "#9a8b81", fontSize: 12.5, lineHeight: 1.7 },
  logo: { height: 38, width: "auto", display: "inline-block", marginBottom: 4 },
  disclaimer: { marginTop: 12, fontSize: 11, color: "#b3a49a" },
};
