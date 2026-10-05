import Link from "next/link";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { roleLabels, type Role } from "@/lib/roles";
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
  if (profile.role !== "owner") {
    return (
      <Work title="משתמשים" role={profile.role}>
        <p className="text-base leading-7 text-muted">
          המסך הזה פתוח לבעלים.{" "}
          <Link href="/account" className="font-bold text-ink underline">
            חזרה לחשבון
          </Link>
        </p>
      </Work>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, active")
    .order("created_at", { ascending: true });
  const users = (data ?? []) as ListedUser[];

  return (
    <Work title="משתמשים" backHref="/more" role={profile.role}>
      <Link href="/users/new" className="button flex items-center justify-center">
        משתמש חדש
      </Link>
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/users/${user.id}`}
          className="rounded-2xl border border-line bg-card px-4 py-4"
        >
          <span className="flex items-start justify-between gap-3">
            <span className="text-lg font-extrabold">{user.full_name || "בלי שם"}</span>
            <span className="text-sm text-muted">
              {user.active ? roleLabels[user.role] : "כבוי"}
            </span>
          </span>
          <span className="mt-2 block text-sm text-muted" dir="ltr">
            {user.email}
          </span>
          {user.phone ? (
            <span className="mt-1 block text-sm text-muted" dir="ltr">
              {user.phone}
            </span>
          ) : null}
        </Link>
      ))}
    </Work>
  );
}
