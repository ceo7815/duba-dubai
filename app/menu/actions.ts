"use server";

import { revalidatePath } from "next/cache";
import { done } from "@/lib/flash";
import { cleanIncluded, isSlot, slots, type IncludedItem, type Slot } from "@/lib/packages";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { ProductInput } from "./types";
import { canOperate } from "@/lib/roles";

const saveErrors: Record<string, string> = {
  owner: "אין לך הרשאה לערוך את התפריט",
  handle: "צריך שם באנגלית (אותיות ומספרים)",
  title: "צריך שם בעברית ושם באנגלית",
  rows: "צריך לפחות מחיר אחד",
  exists: "כבר יש מוצר עם השם הזה באנגלית",
  missing: "המוצר לא נמצא",
  duplicate: "יש שתי אפשרויות מחיר עם אותו שם",
  option: "לכל אפשרות מחיר צריך שם באנגלית",
  number: "מחיר, עלות או גרם לא תקינים",
  collections: "קטגוריה לא מוכרת",
};

async function owner() {
  const profile = await getProfile();
  return canOperate(profile?.role);
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export async function saveProduct(
  input: ProductInput,
): Promise<{ error?: string; handle?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  const supabase = await createClient();

  let handle = input.handle;
  if (input.isNew) {
    const base = slug(input.title_en);
    if (base.length < 2) return { error: saveErrors.handle };
    const { data } = await supabase
      .from("store_products")
      .select("handle")
      .like("handle", `${base}%`);
    const taken = new Set([
      "new",
      ...(data ?? []).map((row) => row.handle as string),
    ]);
    handle = base;
    for (let index = 2; taken.has(handle); index += 1)
      handle = `${base}-${index}`;
  }

  const { data, error } = await supabase.rpc("save_menu_product", {
    payload: {
      handle,
      new: input.isNew ? "true" : "false",
      title_en: input.title_en,
      title_he: input.title_he,
      body_en: input.body_en,
      body_he: input.body_he,
      images: input.images,
      collections: input.collections,
      price_option: input.price_option,
      active: input.active ? "true" : "false",
      rows: input.rows.map((row) => ({
        id: row.id,
        kept: row.kept,
        label_he: row.label_he,
        price: row.price.trim().replace(",", "."),
        compare: row.compare.trim().replace(",", "."),
        cost: row.cost.trim().replace(",", "."),
        grams: row.grams.trim(),
        shortage: row.shortage ? "true" : "false",
      })),
    },
  });
  const result = data as { error?: string; handle?: string } | null;
  if (error || !result) return { error: "השמירה נכשלה" };
  if (result.error)
    return { error: saveErrors[result.error] ?? "השמירה נכשלה" };
  await done("המוצר נשמר ✓");
  return { handle: result.handle };
}

export async function setStock(
  handle: string,
  inStock: boolean,
): Promise<{ error?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  const supabase = await createClient();
  const { error } = await supabase
    .from("dishes")
    .update({ shortage: !inStock })
    .eq("shopify_handle", handle);
  if (error) return { error: "לא עודכן" };
  await done("המלאי עודכן ✓");
  return {};
}

export async function setActive(
  handle: string,
  active: boolean,
): Promise<{ error?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  const supabase = await createClient();
  const { error } = await supabase
    .from("store_products")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("handle", handle);
  if (error) return { error: "לא עודכן" };
  await done("עודכן ✓");
  return {};
}

export async function deleteProduct(
  handle: string,
): Promise<{ error?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  const supabase = await createClient();
  const dishes = await supabase
    .from("dishes")
    .delete()
    .eq("shopify_handle", handle);
  if (dishes.error) return { error: "המחיקה נכשלה" };
  const product = await supabase
    .from("store_products")
    .delete()
    .eq("handle", handle);
  if (product.error) return { error: "המחיקה נכשלה" };
  await done("המוצר נמחק ✓");
  return {};
}

export async function savePackageLimits(
  packageId: string,
  need: Record<Slot, number>,
): Promise<{ error?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  const values = slots.map((slot) => need[slot]);
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 40) || values.every((value) => value === 0))
    return { error: "הכמויות לא תקינות" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_rules")
    .update({ ...need, updated_at: new Date().toISOString() })
    .eq("dish_id", packageId)
    .select("dish_id");
  if (error || !data?.length) return { error: "לא עודכן" };
  revalidatePath("/menu");
  await done("הכמויות נשמרו ✓");
  return {};
}

export async function savePackageIncluded(packageId: string, items: IncludedItem[]): Promise<{ error?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  const included = cleanIncluded(items);
  if (included.length > 20) return { error: "יותר מדי פריטים" };
  if (new Set(included.map((item) => item.name)).size !== included.length) return { error: "יש פריט שמופיע פעמיים" };
  const supabase = await createClient();
  const cleared = await supabase.from("package_includes").delete().eq("package_id", packageId);
  if (cleared.error) return { error: "לא עודכן" };
  if (included.length) {
    const { error } = await supabase.from("package_includes").insert(
      included.map((item, index) => ({
        package_id: packageId,
        name: item.name,
        name_en: item.name_en ?? "",
        quantity: item.quantity,
        position: index + 1,
      })),
    );
    if (error) return { error: "לא עודכן" };
  }
  revalidatePath("/menu");
  await done("נשמר ✓");
  return {};
}

export async function setPackageOption(
  packageId: string,
  slot: string,
  dishId: string,
  on: boolean,
): Promise<{ error?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  if (!isSlot(slot)) return { error: "לא עודכן" };
  const supabase = await createClient();
  const { error } = on
    ? await supabase
        .from("package_options")
        .upsert({ package_id: packageId, slot, dish_id: dishId, position: 100 }, { onConflict: "package_id,slot,dish_id" })
    : await supabase.from("package_options").delete().match({ package_id: packageId, slot, dish_id: dishId });
  if (error) return { error: "לא עודכן" };
  revalidatePath("/menu");
  return {};
}

export async function setDishShortage(dishId: string, shortage: boolean): Promise<{ error?: string }> {
  if (!(await owner())) return { error: saveErrors.owner };
  const supabase = await createClient();
  const { data, error } = await supabase.from("dishes").update({ shortage }).eq("id", dishId).select("id");
  if (error || !data?.length) return { error: "לא עודכן" };
  revalidatePath("/menu");
  return {};
}
