"use server";

import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createChefLink(orderIds: string[]): Promise<{ token: string } | { error: string }> {
  const ids = [...new Set(orderIds)].filter((id) => uuid.test(id)).slice(0, 200);
  if (ids.length === 0) return { error: "אין הזמנות לשליחה" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_kitchen_link", { p_order_ids: ids });
  if (error || typeof data !== "string") return { error: "לא הצלחנו ליצור קישור להדפסה" };
  return { token: data };
}
