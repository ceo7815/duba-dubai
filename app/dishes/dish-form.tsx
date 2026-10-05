"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth-actions";
import { saveDish } from "@/app/dishes/actions";

const initial: FormState = null;

export function DishForm() {
  const [state, action, pending] = useActionState(saveDish, initial);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-extrabold">מנה</h2>
      <input name="name" required placeholder="שם" className="field" />
      <input name="grams" required inputMode="numeric" dir="ltr" placeholder="גרם" className="field field-en" />
      <input name="cost" required inputMode="decimal" dir="ltr" placeholder="עלות מזון" className="field field-en" />
      <input name="price" required inputMode="decimal" dir="ltr" placeholder="מחיר" className="field field-en" />
      <p className="text-sm leading-6 text-muted">
        הרווח כאן הוא מחיר פחות עלות מזון. זה לא רווח העסק.
      </p>
      {state?.error ? <p className="text-sm font-bold">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="button">
        {pending ? "שומרים" : "שמירת מנה"}
      </button>
    </form>
  );
}
