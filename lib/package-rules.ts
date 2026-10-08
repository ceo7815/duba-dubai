import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSlot, type PackageRule } from "@/lib/packages";

type DishRow = { id: string; name: string; price: number | string; image_url: string | null; shortage: boolean };

export async function loadPackages(): Promise<PackageRule[]> {
  const supabase = await createClient();
  const [rules, options] = await Promise.all([
    supabase.from("package_rules").select("dish_id, salad, starter, main"),
    supabase.from("package_options").select("package_id, slot, dish_id, position").order("position", { ascending: true }),
  ]);
  if (rules.error || options.error) {
    console.error("loadPackages failed", rules.error?.message ?? options.error?.message);
    return [];
  }
  const ids = [...new Set([...(rules.data ?? []).map((row) => row.dish_id), ...(options.data ?? []).map((row) => row.dish_id)])];
  if (ids.length === 0) return [];
  const { data: dishes, error } = await supabase
    .from("dishes")
    .select("id, name, price, image_url, shortage")
    .in("id", ids);
  if (error) {
    console.error("loadPackages dishes failed", error.message);
    return [];
  }
  const byId = new Map(((dishes ?? []) as DishRow[]).map((dish) => [dish.id, dish]));

  return (rules.data ?? []).flatMap((rule) => {
    const dish = byId.get(rule.dish_id);
    if (!dish) return [];
    const picked: PackageRule["options"] = { starter: [], main: [], salad: [] };
    for (const row of options.data ?? []) {
      if (row.package_id !== rule.dish_id || !isSlot(row.slot)) continue;
      const option = byId.get(row.dish_id);
      if (!option) continue;
      picked[row.slot].push({
        id: option.id,
        name: option.name,
        price: Number(option.price),
        image_url: option.image_url ?? "",
        shortage: option.shortage,
      });
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
