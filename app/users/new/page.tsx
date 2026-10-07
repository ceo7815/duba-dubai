import { Work } from "@/app/shell";
import { UserForm } from "@/app/users/user-form";
import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { fullAccess } from "@/lib/roles";

export default async function NewUserPage() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect("/login");

  return (
    <Work title="משתמש חדש" backHref="/users" role={profile.role}>
      <section className="rounded-2xl border border-line bg-card p-4">
        <UserForm mode="create" self={false} />
      </section>
    </Work>
  );
}
