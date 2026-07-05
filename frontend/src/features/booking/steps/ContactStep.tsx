import type { CSSProperties } from "react";
import { formatPrice } from "@/lib/formatting";
import type { ServiceOffer } from "@/types/api";

interface ContactStepProps {
  manicure: ServiceOffer;
  stepLabel: string;
  givenName: string;
  phone: string;
  email: string;
  website: string;
  onGivenNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onWebsiteChange: (v: string) => void;
  onContinue: () => void;
  canContinue: boolean;
}

export function ContactStep({
  manicure,
  stepLabel,
  givenName,
  phone,
  email,
  website,
  onGivenNameChange,
  onPhoneChange,
  onEmailChange,
  onWebsiteChange,
  onContinue,
  canContinue,
}: ContactStepProps) {
  const top = manicure.pricing.find((p) => p.tier === "top") ?? manicure.pricing[0];

  return (
    <div>
      <div style={styles.stepLabel}>{stepLabel}</div>
      <h3 style={styles.title}>Let's reserve your spot</h3>
      <p style={styles.subtitle}>
        First-visit price locked:{" "}
        <span style={styles.strike}>{formatPrice(top.compare_at_price ?? top.price)}</span>{" "}
        <strong style={{ color: "var(--color-accent)" }}>{formatPrice(top.price)}</strong>{" "}
        <span style={styles.offerBadge}>{manicure.offer_label}</span>
      </p>

      <label style={styles.label}>First name</label>
      <input
        value={givenName}
        onChange={(e) => onGivenNameChange(e.target.value)}
        name="fname"
        autoComplete="given-name"
        autoCapitalize="words"
        placeholder="Your name"
        style={styles.input}
      />
      <label style={styles.label}>Mobile number</label>
      <input
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        type="tel"
        name="phone"
        autoComplete="tel"
        inputMode="numeric"
        maxLength={14}
        placeholder="(619) 000-0000"
        style={styles.input}
      />
      <label style={styles.label}>Email</label>
      <input
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="off"
        placeholder="you@email.com"
        style={{ ...styles.input, marginBottom: 4 }}
      />
      <div style={styles.hint}>We'll only use these to confirm your appointment.</div>

      {/* Honeypot — invisible to real visitors (off-screen, not display:none, since some bots
          skip display:none fields), left unfilled by humans but often auto-filled by bots that
          blindly complete every input on the page. */}
      <input
        value={website}
        onChange={(e) => onWebsiteChange(e.target.value)}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={styles.honeypot}
      />

      <button
        onClick={onContinue}
        disabled={!canContinue}
        style={{ ...styles.continueButton, background: canContinue ? "var(--color-accent)" : "#d8bfb8" }}
      >
        Continue
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  stepLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "var(--color-accent)",
    fontWeight: 600,
    marginTop: 10,
  },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 26, margin: "6px 0 4px" },
  subtitle: { fontSize: 13.5, color: "var(--color-muted-2)", margin: "0 0 18px" },
  strike: { color: "var(--color-muted-3)", textDecoration: "line-through" },
  offerBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "var(--color-accent)",
    background: "var(--color-accent-tint)",
    padding: "2px 8px",
    borderRadius: 20,
    verticalAlign: "middle",
  },
  label: { fontSize: 13, fontWeight: 500, color: "var(--color-ink-soft)" },
  input: {
    width: "100%",
    minWidth: 0,
    margin: "6px 0 14px",
    padding: 14,
    fontSize: 16,
    border: "1px solid #e0cfc6",
    borderRadius: 11,
    background: "#fff",
  },
  hint: { fontSize: 11.5, color: "var(--color-muted-3)", marginBottom: 16 },
  honeypot: {
    position: "absolute",
    left: "-9999px",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },
  continueButton: {
    width: "100%",
    border: "none",
    color: "#fff7f3",
    fontSize: 16,
    fontWeight: 600,
    padding: 16,
    borderRadius: 12,
    cursor: "pointer",
  },
};
