import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSlot, type PackageOption, type PackageRule } from "@/lib/packages";

type DishRef = { id: string; name: string; price: number | string; image_url?: string | null; shortage: boolean };

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function loadPackages(): Promise<PackageRule[]> {
  const supabase = await createClient();
  const [{ data: rules }, { data: options }] = await Promise.all([
    supabase.from("package_rules").select("dish_id, salad, starter, main, dishes(id, name, price, shortage)"),
    supabase
      .from("package_options")
      .select("package_id, slot, position, dishes(id, name, price, image_url, shortage)")
      .order("position", { ascending: true }),
  ]);
  return (rules ?? []).flatMap((rule) => {
    const dish = one(rule.dishes as DishRef | DishRef[] | null);
    if (!dish) return [];
    const picked: PackageRule["options"] = { starter: [], main: [], salad: [] };
    for (const row of options ?? []) {
      if (row.package_id !== rule.dish_id || !isSlot(row.slot)) continue;
      const option = one(row.dishes as DishRef | DishRef[] | null);
      if (!option) continue;
      picked[row.slot].push({
        id: option.id,
        name: option.name,
        price: Number(option.price),
        image_url: option.image_url ?? "",
        shortage: option.shortage,
      } satisfies PackageOption);
    }
    return [
      {
        id: dish.id,
        name: dish.name,
        price: Number(dish.price),
        shortage: dish.shortage,
        need: { salad: rule.salad, starter: rule.starter, main: rule.main },
        options: picked,
      },
    ];
  });
}
