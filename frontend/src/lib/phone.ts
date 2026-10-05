import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js/min";
import { DEFAULT_COUNTRY, emptyPhone, type PhoneState } from "@/lib/phoneState";

export { DEFAULT_COUNTRY, emptyPhone, type PhoneState };

/**
 * Phone entry rules shared by every form that asks for a phone number (owner request 2026-10-05:
 * "like Square": a country picker, as-you-type formatting, and any country, not just US). Nearly
 * every client is in the US, so US is the default and the US experience stays exactly what it
 * was ("(619) 555-0123"); the picker is there for the rest. Every form submits E.164
 * ("+16195550123", "+380501234567"), which is what Square and our backends store.
 */


/** Shown first in the picker: the US, its neighbours, and where the studio's clients come from. */
const PINNED: CountryCode[] = ["US", "CA", "MX", "UA"];
export const PINNED_COUNT = PINNED.length;

export interface CountryOption {
  code: CountryCode;
  name: string;
  dial: string;
  flag: string;
}

export function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let cachedOptions: CountryOption[] | null = null;

/** Pinned countries, then everything else alphabetically by English name. */
export function countryOptions(): CountryOption[] {
  if (cachedOptions) return cachedOptions;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    names = null;
  }
  const make = (code: CountryCode): CountryOption => ({
    code,
    name: names?.of(code) ?? code,
    dial: getCountryCallingCode(code),
    flag: flagEmoji(code),
  });
  const rest = getCountries()
    .filter((c) => !PINNED.includes(c))
    .map(make)
    .sort((a, b) => a.name.localeCompare(b.name));
  cachedOptions = [...PINNED.map(make), ...rest];
  return cachedOptions;
}


/** Applies whatever the user typed, pasted or autofilled. A number starting with "+" (pasted, or
 * a browser/iOS autofill of the full international number) switches the country to match. For
 * the selected country, digits past the longest possible number are dropped, so a US number
 * stops at 10 digits instead of turning into an invalid 11. */
export function applyInput(raw: string, current: CountryCode): PhoneState {
  const trimmed = raw.trim();
  let country = current;
  let digits = trimmed.replace(/\D/g, "");
  let fromInternational = false;

  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const international = "+" + trimmed.replace(/^00/, "").replace(/\D/g, "");
    const formatter = new AsYouType();
    formatter.input(international);
    const full = parsePhoneNumberFromString(international);
    // A complete number names its country best (+44 7911… is GB, not Guernsey); a partial one
    // only has the formatter's guess.
    const detected = full?.country ?? formatter.getCountry();
    const national = full?.nationalNumber ?? formatter.getNumber()?.nationalNumber;
    if (detected && national) {
      country = detected;
      digits = national;
      fromInternational = true;
    }
  } else if ((country === "US" || country === "CA") && digits.length === 11 && digits.startsWith("1")) {
    // "1 619 555 0123": the trunk prefix, not part of the number.
    digits = digits.slice(1);
  }

  while (digits.length > 0 && validatePhoneNumberLength(digits, country) === "TOO_LONG") {
    digits = digits.slice(0, -1);
  }

  const parsed = digits ? parsePhoneNumberFromString(digits, country) : undefined;
  const valid = Boolean(parsed?.isValid());
  // Pasted/autofilled international numbers come without the national trunk prefix
  // ("+380 50…" -> "50…"); show them the way locals write them ("050 123 4567").
  const display = !digits ? "" : fromInternational && parsed && valid ? parsed.formatNational() : new AsYouType(country).input(digits);
  return { country, display, e164: parsed ? parsed.number : "", valid };
}

/** Pre-fills from a stored value (E.164 or a bare US number). */
export function phoneFromValue(value: string | undefined | null, fallback: CountryCode = DEFAULT_COUNTRY): PhoneState {
  if (!value) return emptyPhone(fallback);
  return applyInput(value, fallback);
}

export function countryName(code: CountryCode): string {
  return countryOptions().find((c) => c.code === code)?.name ?? code;
}

/** Texts (confirmations, reminders) go out from US toll-free numbers, which only reach US and
 * Canadian phones; anyone else should know to expect a call or email instead. */
export function textsReach(country: CountryCode): boolean {
  return country === "US" || country === "CA";
}
