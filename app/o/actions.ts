"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmGuestOrder(token: string): Promise<{ ok: boolean }> {
  if (token.length < 8) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_guest_order", { lookup: token });
  const ok = !error && Boolean((data as { ok?: boolean } | null)?.ok);
  if (!ok) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}
