import type { CSSProperties } from "react";
import logo from "@/assets/logo.png";
import { LOCATION, terminologize } from "@/data/designCopy";
import type { LandingVariantContent } from "@/types/api";

export function Footer({ terminology }: { terminology?: LandingVariantContent["terminology"] }) {
  return (
    <footer style={styles.footer}>
      <img src={logo} alt="AK.LUX.NAILS" style={styles.logo} />
      <div style={{ marginTop: 6 }}>{LOCATION.address}</div>
      <div>Open 7 days a week · By appointment</div>
      <div>★ 4.7 · 113 Google reviews</div>
      <div style={styles.disclaimer}>
        {terminologize("Russian hard-gel manicure only · No acrylics · Health-first nail care", terminology)}
      </div>
    </footer>
  );
}

const styles: Record<string, CSSProperties> = {
  footer: { padding: "24px 22px 34px", textAlign: "center", color: "#9a8b81", fontSize: 12.5, lineHeight: 1.7 },
  logo: { height: 34, width: "auto", display: "inline-block", marginBottom: 4 },
  disclaimer: { marginTop: 12, fontSize: 11, color: "#b3a49a" },
};
