import { notFound, redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { DeleteUser } from "@/app/users/delete-user";
import { ResetPassword } from "@/app/users/reset-password";
import { UserForm } from "@/app/users/user-form";
import { requireProfile } from "@/lib/profile";
import { isRole, fullAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function EditUserPage({ params }: PageProps<"/users/[id]">) {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, active")
    .eq("id", id)
    .maybeSingle();

  if (!data || !isRole(data.role)) notFound();
  const self = data.id === profile.id;

  return (
    <Work title="עריכת משתמש" backHref="/users" role={profile.role}>
      <section className="rounded-2xl border border-line bg-card p-4">
        <UserForm
          mode="edit"
          self={self}
          user={{
            id: data.id,
            full_name: data.full_name,
            phone: data.phone,
            email: data.email,
            role: data.role,
            active: data.active,
          }}
        />
      </section>
      {self ? null : <ResetPassword id={data.id} name={data.full_name} phone={data.phone ?? ""} />}
      {self ? null : <DeleteUser id={data.id} name={data.full_name} />}
    </Work>
  );
}
