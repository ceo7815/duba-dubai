"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth-actions";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function canWriteMoney(role: string | undefined) {
  return role === "owner" || role === "accounts";
}

export async function saveCash(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getProfile();
  if (!canWriteMoney(profile?.role)) return { error: "אין הרשאה לכסף" };
  const direction = field(formData, "direction");
  const amount = Number(field(formData, "amount").replace(",", "."));
  const note = field(formData, "note");
  const happenedOn = field(formData, "happened_on");
  if (direction !== "in" && direction !== "out" && direction !== "refund") {
    return { error: "צריך לבחור נכנס, יוצא או החזר" };
  }
  if (!Number.isFinite(amount) || amount <= 0) return { error: "הסכום לא תקין" };

  const supabase = await createClient();
  const { error } = await supabase.from("cash_entries").insert({
    direction,
    amount,
    note,
    happened_on: happenedOn || undefined,
  });
  if (error) return { error: "המזומן לא נשמר" };
  revalidatePath("/money");
  revalidatePath("/picture");
  return null;
}

export async function saveInvoice(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getProfile();
  if (!canWriteMoney(profile?.role)) return { error: "אין הרשאה לחשבוניות" };
  const supplier = field(formData, "supplier");
  const amount = Number(field(formData, "amount").replace(",", "."));
  const note = field(formData, "note");
  const happenedOn = field(formData, "happened_on");
  if (!supplier) return { error: "צריך ספק" };
  if (!Number.isFinite(amount) || amount < 0) return { error: "הסכום לא תקין" };

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").insert({
    supplier,
    amount,
    note,
    happened_on: happenedOn || undefined,
  });
  if (error) return { error: "החשבונית לא נשמרה" };
  revalidatePath("/money");
  return null;
}

export async function markInvoice(formData: FormData) {
  const profile = await getProfile();
  if (!canWriteMoney(profile?.role)) return;
  const id = field(formData, "id");
  const supabase = await createClient();
  await supabase.from("invoices").update({ sent_to_mali: true }).eq("id", id);
  revalidatePath("/money");
}

export async function saveFee(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getProfile();
  if (profile?.role !== "owner") return { error: "רק הבעלים משנה עמלה" };
  const fee = Number(field(formData, "stripe_fee_percent").replace(",", "."));
  if (!Number.isFinite(fee) || fee < 0 || fee >= 100) return { error: "האחוז לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .update({ stripe_fee_percent: fee })
    .eq("id", 1);
  if (error) return { error: "העמלה לא נשמרה" };
  revalidatePath("/money");
  return null;
}
