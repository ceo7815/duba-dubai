export const currencies = [
  { code: "AED", label: "דירהם", flag: "🇦🇪", symbol: "AED" },
  { code: "USD", label: "דולר", flag: "🇺🇸", symbol: "$" },
  { code: "EUR", label: "יורו", flag: "🇪🇺", symbol: "€" },
  { code: "ILS", label: "שקל", flag: "🇮🇱", symbol: "₪" },
] as const;

export type Currency = (typeof currencies)[number]["code"];
export type ForeignCurrency = Exclude<Currency, "AED">;
export type Rates = Record<ForeignCurrency, number>;

export const isCurrency = (value: string): value is Currency => currencies.some((item) => item.code === value);
export const currencyOf = (code: string) => currencies.find((item) => item.code === code) ?? currencies[0];

export function validRate(value: number) {
  return Number.isFinite(value) && value > 0 && value < 1000;
}

/** Rate = AED per 1 unit. The customer total is rounded up to the next 10. */
export function foreignTotal(aed: number, rate: number) {
  if (!(aed > 0) || !validRate(rate)) return 0;
  return Math.ceil((aed / rate - 0.005) / 10) * 10;
}

export function aedValue(foreign: number, rate: number) {
  return Math.round(foreign * rate * 100) / 100;
}

export function formatCurrency(value: number, code: string) {
  const number = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  return code === "AED" || !isCurrency(code) ? `\u200E${number} AED` : `\u200E${currencyOf(code).symbol}${number}`;
}

type Priced = { amount: number; currency?: string | null; currency_rate?: number | null; amount_foreign?: number | null };

/** Formats an AED value of an order in the customer's currency, with the AED value beside it. */
export function orderMoney(order: Priced, aed: number, withAed = true) {
  const code = order.currency ?? "AED";
  const rate = Number(order.currency_rate);
  if (code === "AED" || order.amount_foreign == null || !validRate(rate)) return formatCurrency(aed, "AED");
  const amount = Number(order.amount);
  const foreign =
    amount > 0 && Math.abs(aed - amount) < 0.01 ? Number(order.amount_foreign) : Math.round((aed / rate) * 100) / 100;
  const shown = formatCurrency(foreign, code);
  return withAed ? `${shown} (${formatCurrency(aed, "AED")})` : shown;
}

export function formatRate(rate: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(rate);
}
