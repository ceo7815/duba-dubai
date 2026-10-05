"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth-actions";
import { MenuField } from "@/app/menu-field";
import { WhenField } from "@/app/when-field";
import { saveCash, saveFee, saveInvoice } from "@/app/money/actions";

const initial: FormState = null;

export function CashForm() {
  const [state, action, pending] = useActionState(saveCash, initial);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-extrabold">מזומן</h2>
      <MenuField
        name="direction"
        defaultValue="in"
        options={[
          { value: "in", label: "נכנס" },
          { value: "out", label: "יוצא" },
          { value: "refund", label: "החזר" },
        ]}
      />
      <input name="amount" required inputMode="decimal" dir="ltr" placeholder="סכום" className="field field-en" />
      <WhenField name="happened_on" />
      <input name="note" placeholder="הערה" className="field" />
      {state?.error ? <p className="text-sm font-bold">{state.error}</p> : null}
      <button disabled={pending} className="button">
        {pending ? "שומרים" : "שמירה"}
      </button>
    </form>
  );
}

export function InvoiceForm() {
  const [state, action, pending] = useActionState(saveInvoice, initial);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-extrabold">חשבונית ספק</h2>
      <input name="supplier" required placeholder="ספק" className="field" />
      <input name="amount" required inputMode="decimal" dir="ltr" placeholder="סכום" className="field field-en" />
      <WhenField name="happened_on" />
      <input name="note" placeholder="הערה לצילום" className="field" />
      {state?.error ? <p className="text-sm font-bold">{state.error}</p> : null}
      <button disabled={pending} className="button">
        {pending ? "שומרים" : "לתור של מלי"}
      </button>
    </form>
  );
}

export function FeeForm({ fee }: { fee: number }) {
  const [state, action, pending] = useActionState(saveFee, initial);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-lg font-extrabold">עמלת סטרייפ</h2>
      <input
        name="stripe_fee_percent"
        required
        inputMode="decimal"
        dir="ltr"
        defaultValue={fee}
        className="field field-en"
      />
      {state?.error ? <p className="text-sm font-bold">{state.error}</p> : null}
      <button disabled={pending} className="button">
        {pending ? "שומרים" : "עדכון אחוז"}
      </button>
    </form>
  );
}
