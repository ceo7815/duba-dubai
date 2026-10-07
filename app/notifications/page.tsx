import type { Metadata } from "next";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { canOperate, fullAccess, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { NotificationsPanel, type NotifyEvent } from "./notifications-panel";

export const metadata: Metadata = { title: "התראות · דובה" };

function eventsFor(role: Role): NotifyEvent[] {
  if (fullAccess(role)) {
    return [
      { key: "new_order", label: "הזמנה חדשה", hint: "מהבוט, מהשיחה או ידנית" },
      { key: "paid", label: "תשלום התקבל", hint: "כולל הזמנה חדשה מהאתר ששולמה" },
      { key: "confirmed", label: "לקוח אישר סיכום", hint: "ההזמנה עוברת למטבח" },
    ];
  }
  if (canOperate(role)) {
    return [
      { key: "new_order", label: "הזמנה חדשה", hint: "מהבוט, מהשיחה או ידנית" },
      { key: "confirmed", label: "לקוח אישר סיכום", hint: "ההזמנה עוברת למטבח" },
    ];
  }
  if (role === "kitchen") {
    return [{ key: "kitchen", label: "הזמנה נכנסה למטבח", hint: "רק הזמנות של היום" }];
  }
  return [];
}

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: key }, { data: me }, { count }] = await Promise.all([
    supabase.rpc("vapid_public_key"),
    supabase.from("profiles").select("notify").eq("id", profile.id).maybeSingle(),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);

  return (
    <Work title="התראות" role={profile.role}>
      <NotificationsPanel
        publicKey={typeof key === "string" ? key : ""}
        events={eventsFor(profile.role)}
        prefs={(me?.notify ?? {}) as Record<string, boolean>}
        devices={count ?? 0}
      />
    </Work>
  );
}
