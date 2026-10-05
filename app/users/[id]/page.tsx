import { notFound, redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { UserForm } from "@/app/users/user-form";
import { requireProfile } from "@/lib/profile";
import { isRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/account");

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, active")
    .eq("id", id)
    .maybeSingle();

  if (!data || !isRole(data.role)) notFound();

  return (
    <Work title="עריכת משתמש" backHref="/users" role={profile.role}>
      <UserForm
          mode="edit"
          self={data.id === profile.id}
          user={{
            id: data.id,
            full_name: data.full_name,
            phone: data.phone,
            email: data.email,
            role: data.role,
            active: data.active,
          }}
        />
    </Work>
  );
}
