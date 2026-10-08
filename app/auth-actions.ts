"use server";

import { randomInt } from "crypto";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { flash } from "@/lib/flash";
import { redirect } from "next/navigation";
import { accessToken, getProfile } from "@/lib/profile";
import { isRole, fullAccess } from "@/lib/roles";
import { manageUsers } from "@/lib/manage-users";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | null;

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function login(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "הדוא״ל או הסיסמה לא נכונים" };

  const profile = await getProfile();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "החשבון הזה כבוי" };
  }

  redirect("/login");
}

export async function setupOwner(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const fullName = field(formData, "full_name");
  const phone = field(formData, "phone");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email.includes("@") || password.length < 8) {
    return { error: "צריך שם, דוא״ל וסיסמה של 8 תווים לפחות" };
  }

  const created = await manageUsers({
    action: "setup",
    full_name: fullName,
    phone,
    email,
    password,
  });
  if ("error" in created) return created;

  return login(_state, formData);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createUser(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getProfile();
  if (!fullAccess(profile?.role))
    return { error: "רק בעלים יכול להוסיף משתמש" };

  const fullName = field(formData, "full_name");
  const phone = field(formData, "phone");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = field(formData, "role");

  if (!isRole(role)) return { error: "תפקיד לא תקין" };
  if (!fullName || !email.includes("@") || password.length < 8) {
    return { error: "צריך שם, דוא״ל וסיסמה של 8 תווים לפחות" };
  }

  const token = await accessToken();
  if (!token) return { error: "נדרשת כניסה מחדש" };

  const created = await manageUsers(
    {
      action: "create",
      full_name: fullName,
      phone,
      email,
      password,
      role,
    },
    token,
  );
  if ("error" in created) return created;

  await flash("המשתמש נוסף ✓");

  redirect("/users");
}

export async function updateUser(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getProfile();
  if (!fullAccess(profile?.role)) return { error: "רק בעלים יכול לעדכן משתמש" };

  const id = field(formData, "id");
  const fullName = field(formData, "full_name");
  const phone = field(formData, "phone");
  const role = field(formData, "role");
  const password = String(formData.get("password") ?? "");
  const active = formData.get("active") === "on";

  if (!isRole(role)) return { error: "תפקיד לא תקין" };
  if (!id || !fullName) return { error: "חסר שם" };
  if (password && password.length < 8) {
    return { error: "סיסמה חדשה צריכה 8 תווים לפחות" };
  }

  const token = await accessToken();
  if (!token) return { error: "נדרשת כניסה מחדש" };

  const updated = await manageUsers(
    {
      action: "update",
      id,
      full_name: fullName,
      phone,
      role,
      active: String(active),
      password,
    },
    token,
  );
  if ("error" in updated) return updated;

  await flash("השינויים נשמרו ✓");

  redirect("/users");
}

const passwordWords = ["duba", "shabbat", "kosher", "dubai", "challah", "kitchen", "table", "dinner"];

function friendlyPassword() {
  const word = passwordWords[randomInt(passwordWords.length)];
  const digits = String(randomInt(1000, 10000));
  return `${word}${digits}`;
}

async function loginWorks(email: string, password: string) {
  const probe = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (!error) await probe.auth.signOut();
  return !error;
}

export async function resetUserPassword(
  id: string,
): Promise<{ error: string } | { password: string; email: string; verified: boolean }> {
  const profile = await getProfile();
  if (!fullAccess(profile?.role)) return { error: "רק בעלים יכול לאפס סיסמה" };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, active")
    .eq("id", id)
    .maybeSingle();
  if (!target || !isRole(target.role)) return { error: "המשתמש לא נמצא" };

  const token = await accessToken();
  if (!token) return { error: "נדרשת כניסה מחדש" };

  const password = friendlyPassword();
  const updated = await manageUsers(
    {
      action: "update",
      id,
      full_name: target.full_name,
      phone: target.phone ?? "",
      role: target.role,
      active: "true",
      password,
    },
    token,
  );
  if ("error" in updated) return updated;

  const email = String(target.email ?? "").toLowerCase();
  return { password, email, verified: await loginWorks(email, password) };
}

export async function deleteUser(id: string): Promise<FormState> {
  const profile = await getProfile();
  if (!fullAccess(profile?.role)) return { error: "רק בעלים יכול למחוק משתמש" };
  if (!id || id === profile.id) return { error: "אי אפשר למחוק את עצמך" };

  const token = await accessToken();
  if (!token) return { error: "נדרשת כניסה מחדש" };

  const removed = await manageUsers({ action: "delete", id }, token);
  if ("error" in removed) return removed;

  await flash("המשתמש נמחק ✓");

  redirect("/users");
}
