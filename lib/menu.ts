import { createClient } from "@/lib/supabase/server";
import type { MenuDish } from "@/lib/catalog";

export type { MenuDish };

export async function listMenu() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dishes")
    .select("id, name, price, category, image_url, shortage")
    .order("position", { ascending: true });
  return (data ?? []).map((dish) => ({
    ...dish,
    price: Number(dish.price),
  })) as MenuDish[];
}
