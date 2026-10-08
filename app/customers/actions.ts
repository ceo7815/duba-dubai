"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import { canOperate } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export async function deleteCustomer(phoneKey: string) {
  const profile = await getProfile();
  if (!canOperate(profile?.role)) return { error: "אין הרשאה" };
  if (!/^\d{4,20}$/.test(phoneKey)) return { error: "לקוח לא נמצא" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").delete().eq("phone_key", phoneKey).select("id");
  if (error || !data?.length) return { error: "המחיקה נכשלה. נסו שוב" };

  revalidatePath("/customers");
  return {};
}
