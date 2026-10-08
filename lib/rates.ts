import "server-only";
import type { ForeignCurrency, Rates } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";

export const fallbackRates: Rates = { USD: 3.6725, EUR: 4.25, ILS: 0.98 };

export type RateRow = { code: ForeignCurrency; rate: number; updated_at: string };

export async function loadRateRows(): Promise<RateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("currency_rates").select("code, rate, updated_at");
  return (data ?? []).map((row) => ({
    code: row.code as ForeignCurrency,
    rate: Number(row.rate),
    updated_at: row.updated_at,
  }));
}

export async function loadRates(): Promise<Rates> {
  const rows = await loadRateRows();
  const rates = { ...fallbackRates };
  for (const row of rows) if (row.rate > 0) rates[row.code] = row.rate;
  return rates;
}
