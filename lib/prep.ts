import { createClient } from "@/lib/supabase/server";

export type ItemRow = {
  order_id: string;
  name: string;
  quantity: number;
  category: string;
  handle: string;
};

export type PrepLine = { name: string; group: string; quantity: number };

const PACKAGE_HANDLES: Record<string, "couple" | "family"> = {
  "friday-couples-meal": "couple",
  "family-friday-dinner": "family",
};

const PICK_GROUPS: Record<string, string> = {
  סלט: "סלטים",
  ראשונה: "ראשונות",
  עיקרית: "עיקריות",
};

export async function itemsFor(orderIds: string[]) {
  if (orderIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_items")
    .select("order_id, name, quantity, dishes(category, shopify_handle)")
    .in("order_id", orderIds);
  return (data ?? []).map((row) => {
    const linked = row.dishes as { category: string; shopify_handle: string | null } | { category: string; shopify_handle: string | null }[] | null;
    const dish = Array.isArray(linked) ? linked[0] : linked;
    return {
      order_id: row.order_id as string,
      name: row.name as string,
      quantity: Number(row.quantity),
      category: dish?.category ?? "",
      handle: dish?.shopify_handle ?? "",
    } satisfies ItemRow;
  });
}

export function prepFrom(items: ItemRow[]) {
  const packages = { couple: 0, family: 0 };
  const totals = new Map<string, PrepLine>();
  for (const item of items) {
    const pack = PACKAGE_HANDLES[item.handle];
    if (pack) {
      packages[pack] += item.quantity;
      continue;
    }
    let name = item.name;
    let group = item.category || "אחר";
    const pick = name.match(/^↳\s*([^:]+):\s*(.+)$/);
    if (pick) {
      group = PICK_GROUPS[pick[1].trim()] ?? pick[1].trim();
      name = pick[2].trim();
    }
    const key = `${group}|${name}`;
    const line = totals.get(key) ?? { name, group, quantity: 0 };
    line.quantity += item.quantity;
    totals.set(key, line);
  }
  const lines = [...totals.values()].toSorted((a, b) => b.quantity - a.quantity);
  return { packages, lines };
}
