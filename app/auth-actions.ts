"use server";

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
