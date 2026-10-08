export const slots = ["starter", "main", "salad"] as const;
export type Slot = (typeof slots)[number];

export const slotLabels: Record<Slot, string> = { starter: "ראשונה", main: "עיקרית", salad: "סלט" };
export const slotTitles: Record<Slot, string> = { starter: "מנות ראשונות", main: "מנות עיקריות", salad: "סלטים" };
export const slotEnglish: Record<Slot, string> = { starter: "Starter", main: "Main", salad: "Salad" };

export function isSlot(value: unknown): value is Slot {
  return typeof value === "string" && (slots as readonly string[]).includes(value);
}

export type PackageOption = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  shortage: boolean;
};

export type PackageRule = {
  id: string;
  name: string;
  price: number;
  shortage: boolean;
  need: Record<Slot, number>;
  options: Record<Slot, PackageOption[]>;
};

/** Chosen quantities keyed by `${slot}:${dishId}`. */
export type PackagePicks = Record<string, number>;

export const pickKey = (slot: Slot, dishId: string) => `${slot}:${dishId}`;

export function slotCount(picks: PackagePicks, slot: Slot) {
  let sum = 0;
  for (const [key, count] of Object.entries(picks)) if (key.startsWith(`${slot}:`)) sum += count;
  return sum;
}

export function missing(rule: PackageRule, picks: PackagePicks) {
  return slots
    .map((slot) => ({ slot, left: rule.need[slot] - slotCount(picks, slot) }))
    .filter((row) => row.left !== 0);
}

export function missingText(rule: PackageRule, picks: PackagePicks) {
  return missing(rule, picks)
    .map(({ slot, left }) =>
      left > 0 ? `חסר ${left} ${slotLabels[slot]}` : `${-left} ${slotLabels[slot]} מעבר למכסה`,
    )
    .join(" · ");
}

export function pickLine(slot: Slot, name: string) {
  return `↳ ${slotLabels[slot]}: ${name}`;
}

const labelSlot = Object.fromEntries(slots.map((slot) => [slotLabels[slot], slot])) as Record<string, Slot>;

export function parsePick(line: string): { slot: Slot | null; label: string; name: string } | null {
  const match = line.match(/^↳\s*([^:]+):\s*(.+)$/);
  if (!match) return null;
  const label = match[1].trim();
  return { slot: labelSlot[label] ?? null, label, name: match[2].trim() };
}

type PackLine = { dish_id: string | null; name: string; quantity: number; unit_price: number };

/** Validates submitted packages against their exact quotas and turns them into order lines. */
export function buildPackLines(inputs: unknown[], rules: PackageRule[]): { lines: PackLine[] } | { error: string } {
  const lines: PackLine[] = [];
  for (const input of inputs) {
    const value = input as { package_id?: unknown; picks?: unknown } | null;
    const rule = rules.find((row) => row.id === value?.package_id);
    if (!rule || !Array.isArray(value?.picks)) return { error: "חבילה לא נמצאה" };
    const picks: PackagePicks = {};
    for (const raw of value.picks as { slot?: unknown; dish_id?: unknown; quantity?: unknown }[]) {
      const quantity = Number(raw?.quantity);
      if (!isSlot(raw?.slot) || !Number.isInteger(quantity) || quantity < 1 || quantity > 40)
        return { error: `${rule.name}: בחירה לא תקינה` };
      if (!rule.options[raw.slot].some((option) => option.id === raw.dish_id))
        return { error: `${rule.name}: מנה שלא שייכת לחבילה` };
      const key = pickKey(raw.slot, String(raw.dish_id));
      picks[key] = (picks[key] ?? 0) + quantity;
    }
    const text = missingText(rule, picks);
    if (text) return { error: `${rule.name}: ${text}` };
    lines.push({ dish_id: rule.id, name: rule.name, quantity: 1, unit_price: rule.price });
    for (const slot of slots) {
      for (const option of rule.options[slot]) {
        const quantity = picks[pickKey(slot, option.id)];
        if (quantity) lines.push({ dish_id: null, name: pickLine(slot, option.name), quantity, unit_price: 0 });
      }
    }
  }
  return { lines };
}

/** Rebuilds package choices from saved order lines (package line followed by its ↳ lines). */
export function packsFromItems(
  items: { dish_id: string | null; name: string; quantity: number }[],
  rules: PackageRule[],
) {
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const packs: { packageId: string; picks: PackagePicks }[] = [];
  let current: { rule: PackageRule; picks: PackagePicks } | null = null;
  for (const item of items) {
    const rule = item.dish_id ? byId.get(item.dish_id) : undefined;
    if (rule) {
      for (let n = 0; n < Math.max(1, item.quantity); n += 1) {
        const picks: PackagePicks = {};
        packs.push({ packageId: rule.id, picks });
        if (n === 0) current = { rule, picks };
      }
      continue;
    }
    const pick = parsePick(item.name);
    if (!pick || !current) {
      if (item.dish_id) current = null;
      continue;
    }
    if (!pick.slot) continue;
    const option = current.rule.options[pick.slot].find((row) => row.name === pick.name);
    if (!option) continue;
    const key = pickKey(pick.slot, option.id);
    current.picks[key] = (current.picks[key] ?? 0) + item.quantity;
  }
  return packs;
}
