import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { roleLabels, roleNotes, type Role, fullAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ListedUser = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  active: boolean;
};

export default async function UsersPage() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, active")
    .order("created_at", { ascending: true });
  const users = (data ?? []) as ListedUser[];
  const activeCount = users.filter((user) => user.active).length;

  return (
    <Work title="משתמשים" role={profile.role}>
      <p className="text-sm text-muted">
        {activeCount} פעילים{users.length > activeCount ? ` · ${users.length - activeCount} מושבתים` : ""}
      </p>
      <Link href="/users/new" className="button flex items-center justify-center gap-2">
        <span className="text-xl leading-none">+</span> משתמש חדש
      </Link>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/users/${user.id}`}
            className={`flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 last:border-b-0 ${
              user.active ? "" : "opacity-55"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-base font-extrabold text-white">
                {(user.full_name || user.email).trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-base font-extrabold">{user.full_name || "בלי שם"}</span>
                  {user.id === profile.id ? <span className="shrink-0 text-xs font-bold text-muted">(את/ה)</span> : null}
                </span>
                <span className="block truncate text-xs text-muted" dir="ltr">
                  {user.email}
                </span>
                <span className="block truncate text-xs text-muted">{roleNotes[user.role]}</span>
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-extrabold">{roleLabels[user.role]}</span>
              {user.active ? null : (
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-bold">מושבת</span>
              )}
            </span>
          </Link>
        ))}
      </div>
      <p className="px-1 text-xs leading-5 text-muted">
        לחיצה על משתמש פותחת עריכה: שם, טלפון, תפקיד, סיסמה חדשה, השבתת החשבון או מחיקה.
      </p>
    </Work>
  );
}
