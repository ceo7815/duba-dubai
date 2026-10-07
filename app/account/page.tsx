import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { fullAccess } from "@/lib/roles";

export default async function AccountPage() {
  const profile = await requireProfile();
  redirect(fullAccess(profile?.role) ? "/users" : "/login");
}
