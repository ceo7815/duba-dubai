"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth-actions";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function saveDish(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getProfile();
  if (profile?.role !== "owner") return { error: "רק הבעלים שומרת מנה" };

  const name = field(formData, "name");
  const grams = Number(field(formData, "grams"));
  const cost = Number(field(formData, "cost").replace(",", "."));
  const price = Number(field(formData, "price").replace(",", "."));
  if (!name || !Number.isInteger(grams) || grams < 1) return { error: "צריך שם ומשקל" };
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price < 0) {
    return { error: "עלות או מחיר לא תקינים" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("dishes").insert({ name, grams, cost, price });
  if (error) return { error: "המנה לא נשמרה" };
  revalidatePath("/dishes");
  return null;
}

export async function toggleShortage(formData: FormData) {
  const profile = await getProfile();
  if (profile?.role !== "owner") return;
  const id = field(formData, "id");
  const shortage = field(formData, "shortage") === "yes";
  const supabase = await createClient();
  await supabase.from("dishes").update({ shortage }).eq("id", id);
  revalidatePath("/dishes");
}
