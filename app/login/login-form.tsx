"use client";

import { useActionState, useState } from "react";
import { login, type FormState } from "@/app/auth-actions";

const initial: FormState = null;

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-bold">
        דוא״ל
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue=""
          dir="ltr"
          required
          className="field field-en"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-bold">
        סיסמה
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue=""
          dir="ltr"
          required
          className="field field-en"
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-muted">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
          className="size-5"
        />
        הצג סיסמה
      </label>
      {state?.error ? (
        <p role="alert" className="text-sm font-bold text-[#f0c9a0]">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="button">
        {pending ? "נכנסים" : "כניסה"}
      </button>
    </form>
  );
}
