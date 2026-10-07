"use server";

import { done } from "@/lib/flash";
import type { FormState } from "@/app/auth-actions";
import { getProfile } from "@/lib/profile";
import { fullAccess, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { isExpenseKind, isPaymentMethod } from "./expense-types";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function canWriteMoney(role: Role | undefined) {
  return fullAccess(role) || role === "accounts";
}

export type ExpenseState = { error?: string; saved?: number } | null;

export async function saveExpense(
  state: ExpenseState,
  formData: FormData,
): Promise<ExpenseState> {
  const profile = await getProfile();
  if (!canWriteMoney(profile?.role)) return { error: "אין הרשאה להוצאות" };
  const kind = field(formData, "kind");
  const method = field(formData, "method");
  const supplier = field(formData, "supplier");
  const amount = Number(field(formData, "amount").replace(/,/g, ""));
  const note = field(formData, "note");
  const happenedOn = field(formData, "happened_on");
  if (!isExpenseKind(kind)) return { error: "צריך לבחור סוג הוצאה" };
  if (!supplier) return { error: "צריך למלא שם" };
  if (!Number.isFinite(amount) || amount <= 0)
    return { error: "הסכום לא תקין" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(happenedOn))
    return { error: "צריך לבחור תאריך תשלום" };
  if (!isPaymentMethod(method)) return { error: "צריך לבחור אופן תשלום" };

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").insert({
    kind,
    method,
    supplier,
    amount: Math.round(amount * 100) / 100,
    note,
    happened_on: happenedOn,
  });
  if (error) return { error: "ההוצאה לא נשמרה" };
  await done("ההוצאה נשמרה ✓");
  return { saved: (state?.saved ?? 0) + 1 };
}

export async function deleteExpense(formData: FormData) {
  const profile = await getProfile();
  if (!fullAccess(profile?.role)) return;
  const supabase = await createClient();
  await supabase.from("invoices").delete().eq("id", field(formData, "id"));
  await done("ההוצאה נמחקה ✓");
}

export async function markInvoice(formData: FormData) {
  const profile = await getProfile();
  if (!canWriteMoney(profile?.role)) return;
  const id = field(formData, "id");
  const supabase = await createClient();
  await supabase.from("invoices").update({ sent_to_mali: true }).eq("id", id);
  await done("סומן שנשלח לאילנית ✓");
}

export async function saveFee(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getProfile();
  if (!fullAccess(profile?.role)) return { error: "רק הבעלים משנה עמלה" };
  const fee = Number(field(formData, "stripe_fee_percent").replace(",", "."));
  if (!Number.isFinite(fee) || fee < 0 || fee >= 100)
    return { error: "האחוז לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .update({ stripe_fee_percent: fee })
    .eq("id", 1);
  if (error) return { error: "העמלה לא נשמרה" };
  await done("העמלה נשמרה ✓");
  return null;
}
