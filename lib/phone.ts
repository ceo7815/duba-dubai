import { parsePhoneNumberFromString, type CountryCode, type PhoneNumber } from "libphonenumber-js";

export type { CountryCode };

export const defaultCountry: CountryCode = "IL";

function candidates(value: string, country?: CountryCode): (PhoneNumber | undefined)[] {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [];
  if (raw.startsWith("+")) return [parsePhoneNumberFromString(raw)];
  if (digits.startsWith("00")) return [parsePhoneNumberFromString(`+${digits.slice(2)}`)];
  return [
    country ? parsePhoneNumberFromString(raw, country) : undefined,
    parsePhoneNumberFromString(raw, "IL"),
    parsePhoneNumberFromString(raw, "AE"),
    parsePhoneNumberFromString(`+${digits}`),
  ];
}

export function readPhone(value: string, country?: CountryCode) {
  const list = candidates(value, country);
  return list.find((item) => item?.isValid()) ?? list.find(Boolean) ?? null;
}

export function normalizePhone(value: string) {
  const parsed = readPhone(value);
  if (!parsed?.isValid()) return null;
  return { phone: parsed.formatInternational(), key: parsed.number.replace(/\D/g, "") };
}
