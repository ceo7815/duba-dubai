"use client";

import { useActionState, useState } from "react";
import { createUser, updateUser, type FormState } from "@/app/auth-actions";
import { MenuField } from "@/app/menu-field";
import { roleLabels, roleNotes, roles, type Role } from "@/lib/roles";

const initial: FormState = null;

export function UserForm({
  mode,
  user,
  self,
}: {
  mode: "create" | "edit";
  self: boolean;
  user?: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    role: Role;
    active: boolean;
  };
}) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createUser : updateUser,
    initial,
  );
  const [role, setRole] = useState<Role>(user?.role ?? "kitchen");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <label className="flex flex-col gap-2 text-sm font-medium">
        שם
        <input
          name="full_name"
          defaultValue={user?.full_name}
          autoComplete="name"
          required
          className="field"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        טלפון
        <input
          name="phone"
          type="tel"
          defaultValue={user?.phone}
          autoComplete="tel"
          dir="ltr"
          className="field field-en"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        דוא״ל
        {mode === "create" ? (
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
            required
            className="field field-en"
          />
        ) : (
          <span className="field field-en text-muted">{user?.email}</span>
        )}
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        {mode === "create" ? "סיסמה" : "סיסמה חדשה"}
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required={mode === "create"}
          minLength={mode === "create" ? 8 : undefined}
          placeholder={mode === "edit" ? "השאירו ריק כדי לא לשנות" : undefined}
          dir="ltr"
          className="field field-en"
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
          className="size-5 accent-accent"
        />
        הצג סיסמה
      </label>
      {self ? (
        <input type="hidden" name="role" value={user?.role ?? "owner"} />
      ) : (
        <label className="flex flex-col gap-2 text-sm font-medium">
          תפקיד
          <MenuField
            name="role"
            value={role}
            onChange={(next) => setRole(next as Role)}
            options={roles.map((item) => ({ value: item, label: roleLabels[item] }))}
          />
          <span className="font-normal text-muted">{roleNotes[role]}</span>
        </label>
      )}
      {mode === "edit" && !self ? (
        <label className="flex min-h-12 items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-sm font-medium">
          <input
            type="checkbox"
            name="active"
            defaultChecked={user?.active}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span>
            <span className="block font-extrabold">החשבון פעיל</span>
            <span className="block text-muted">בלי הסימון החשבון מושבת והמשתמש לא יכול להיכנס</span>
          </span>
        </label>
      ) : mode === "edit" ? (
        <input type="hidden" name="active" value="on" />
      ) : null}
      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-accent">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="button">
        {pending ? "שומרים" : mode === "create" ? "הוספת משתמש" : "שמירה"}
      </button>
    </form>
  );
}
