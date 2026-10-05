import { Work } from "@/app/shell";
import { UserForm } from "@/app/users/user-form";
import { requireProfile } from "@/lib/profile";
import { redirect } from "next/navigation";

export default async function NewUserPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/account");

  return (
    <Work title="משתמש חדש" backHref="/users" role={profile.role}>
      <UserForm mode="create" self={false} />
    </Work>
  );
}
