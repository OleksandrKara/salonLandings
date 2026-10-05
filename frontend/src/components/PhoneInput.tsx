import { useId, useMemo, useState, type CSSProperties } from "react";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";
import { applyInput, countryName, countryOptions, flagEmoji, PINNED_COUNT, textsReach } from "@/lib/phone";
import type { PhoneState } from "@/lib/phoneState";

/**
 * Phone field with a country picker, like Square's (owner request 2026-10-05): US by default and
 * formatted as typed ("(619) 555-0123"), any other country one tap away, and a pasted or
 * autofilled "+380…" switches the country by itself. A wrong number is only flagged once the
 * client leaves the field (or tries to continue), never while still typing; the parent reads
 * `valid` to keep Continue disabled until it is a real number for that country.
 *
 * The picker is a native <select> laid over the flag chip: on phones that opens the system list.
 * `fieldStyle` is the form's own input look (border, radius, margins), applied to the whole box.
 */
export default function PhoneInput({
  value,
  onChange,
  fieldStyle,
  showErrors = false,
  placeholder,
}: {
  value: PhoneState;
  onChange: (next: PhoneState) => void;
  fieldStyle?: CSSProperties;
  showErrors?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const options = useMemo(() => countryOptions(), []);
  const showError = (touched && value.display !== "" && !value.valid) || (showErrors && !value.valid);
  const { margin, marginTop, marginBottom, padding, ...boxLook } = fieldStyle ?? {};

  return (
    <div style={{ margin, marginTop, marginBottom }}>
      <div
        style={{
          ...boxLook,
          display: "flex",
          alignItems: "stretch",
          padding: 0,
          overflow: "hidden",
          ...(showError ? { border: "1px solid #d93025" } : focused ? { border: "1px solid var(--color-accent)" } : {}),
        }}
      >
        <label style={styles.chip}>
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
            {flagEmoji(value.country)}
          </span>
          <span style={{ fontSize: 15 }}>+{getCountryCallingCode(value.country)}</span>
          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" style={{ color: "var(--color-muted-2)" }}>
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <select
            aria-label={`Country code, ${countryName(value.country)} selected`}
            value={value.country}
            onChange={(e) => onChange(applyInput(value.display, e.target.value as CountryCode))}
            style={styles.select}
          >
            <optgroup label="Common">
              {options.slice(0, PINNED_COUNT).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} (+{c.dial})
                </option>
              ))}
            </optgroup>
            <optgroup label="All countries">
              {options.slice(PINNED_COUNT).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} (+{c.dial})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <input
          id={id}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          placeholder={placeholder ?? (value.country === "US" || value.country === "CA" ? "(619) 555-0123" : "Phone number")}
          value={value.display}
          onChange={(e) => onChange(applyInput(e.target.value, value.country))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTouched(true);
          }}
          style={{ ...styles.input, padding: padding ?? 12 }}
        />
        {value.valid ? (
          <span aria-hidden="true" style={styles.check}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
        ) : null}
      </div>
      {showError ? (
        <div id={`${id}-error`} role="alert" style={styles.error}>
          {value.display === ""
            ? "Please enter your phone number."
            : value.country === "US"
              ? "Please enter a 10-digit US phone number."
              : `This doesn't look like a valid ${countryName(value.country)} number.`}
        </div>
      ) : value.valid && !textsReach(value.country) ? (
        <div style={styles.note}>We&apos;ll call you; text messages only reach US and Canadian numbers.</div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  chip: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "0 10px 0 12px",
    borderRight: "1px solid #e0cfc6",
    background: "var(--color-bg-soft, #faf6f3)",
    cursor: "pointer",
    flexShrink: 0,
    color: "var(--color-ink, #2a211d)",
  },
  select: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", fontSize: 16 },
  input: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16 },
  check: { display: "flex", alignItems: "center", paddingRight: 12, color: "#1e8e3e" },
  error: { color: "#d93025", fontSize: 12.5, marginTop: 4 },
  note: { color: "var(--color-muted-2)", fontSize: 12, marginTop: 4 },
};
