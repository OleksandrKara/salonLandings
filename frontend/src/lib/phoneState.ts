import type { CountryCode } from "libphonenumber-js/min";

/** The light half of lib/phone.ts: types and the empty value, with no runtime import of
 * libphonenumber-js, so booking state can be created on the landing page without pulling the
 * phone-number metadata into the first page load. */
export const DEFAULT_COUNTRY: CountryCode = "US";

export interface PhoneState {
  country: CountryCode;
  /** What the input shows: the national number, formatted as typed ("(619) 555-01"). */
  display: string;
  /** "+16195550123" once the number parses for the country, else "". */
  e164: string;
  valid: boolean;
}

export function emptyPhone(country: CountryCode = DEFAULT_COUNTRY): PhoneState {
  return { country, display: "", e164: "", valid: false };
}
