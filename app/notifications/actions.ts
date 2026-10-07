"use server";

import { done } from "@/lib/flash";
import { accessToken, getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type PushKeys = { endpoint: string; p256dh: string; auth: string };

const events = ["new_order", "paid", "confirmed", "kitchen"];

export async function savePushSubscription(keys: PushKeys, device: string) {
  if (!(await getProfile())) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: keys.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_device: device,
  });
  return { ok: !error && data === true };
}

export async function removePushSubscription(endpoint: string) {
  if (!(await getProfile()) || !endpoint) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: !error };
}

export async function setNotifyPrefs(prefs: Record<string, boolean>) {
  if (!(await getProfile())) return { error: "נדרשת כניסה" };
  const clean = Object.fromEntries(
    Object.entries(prefs).filter(([key, value]) => events.includes(key) && typeof value === "boolean"),
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_notify_prefs", { prefs: clean });
  if (error || data !== true) return { error: "ההעדפות לא נשמרו" };
  await done("ההעדפות נשמרו ✓");
  return {};
}

export async function sendTestPush(): Promise<{ error?: string; sent?: number }> {
  const token = await accessToken();
  if (!token) return { error: "נדרשת כניסה מחדש" };
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-notify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: "test" }),
  });
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; sent?: number } | null;
  if (!response.ok || !payload?.ok) return { error: "ההתראה לא נשלחה" };
  if (!payload.sent) return { error: "לא נמצא מכשיר פעיל. צריך להפעיל התראות קודם" };
  return { sent: payload.sent };
}
