import { redirect } from "next/navigation";
import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  active: boolean;
};

export async function getProfile() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, active")
    .eq("id", id)
    .maybeSingle();

  return profile as Profile | null;
}

export async function requireProfile() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function accessToken() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
