"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/auth-actions";
import { WhenField } from "@/app/when-field";
import { saveExpense, saveFee, saveRates, type ExpenseState } from "@/app/money/actions";
import { currencies, type ForeignCurrency } from "@/lib/currency";
import { expenseKinds, paymentMethods, type ExpenseKind, type PaymentMethod } from "./expense-types";

const initial: FormState = null;

export function ExpenseForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ExpenseState, FormData>(saveExpense, null);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">הוצאה חדשה</h2>
        {state?.saved && !pending ? <span className="text-sm font-bold text-muted">נשמר ✓</span> : null}
      </div>
      <ExpenseFields key={state?.saved ?? 0} today={today} />
      {state?.error ? <p className="text-sm font-bold">{state.error}</p> : null}
      <button disabled={pending} className="button">
        {pending ? "שומרים…" : "שמירת הוצאה"}
      </button>
    </form>
  );
}

function ExpenseFields({ today }: { today: string }) {
  const [kind, setKind] = useState<ExpenseKind>("supplier");
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const current = expenseKinds.find((item) => item.id === kind)!;

  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="method" value={method} />

      <Segmented label="סוג הוצאה" options={expenseKinds} value={kind} onChange={setKind} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-muted">{current.payee}</span>
        <input name="supplier" required placeholder={current.hint} className="field" autoComplete="off" />
      </label>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-muted">סכום (AED)</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            dir="ltr"
            placeholder="0"
            className="field field-en text-lg font-extrabold"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-muted">תאריך תשלום</span>
          <WhenField name="happened_on" defaultValue={today} />
        </div>
      </div>

      <Segmented label="אופן תשלום" options={paymentMethods} value={method} onChange={setMethod} columns={4} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-muted">הערות</span>
        <textarea
          name="note"
          rows={2}
          placeholder="מספר חשבונית, על מה שולם…"
          className="field resize-none py-3 leading-6"
        />
      </label>
    </>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 3,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={label}>
      <span className="text-xs font-bold text-muted">{label}</span>
      <div
        className="grid gap-1 rounded-2xl bg-paper p-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            onClick={() => onChange(option.id)}
            className={`min-h-11 rounded-xl px-1 text-[13px] font-extrabold leading-tight ${
              value === option.id ? "bg-ink text-white shadow-sm" : "text-ink/70"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConfirmDelete() {
  return (
    <button
      className="px-1 text-xs font-bold text-muted underline"
      onClick={(event) => {
        if (!window.confirm("למחוק את ההוצאה?")) event.preventDefault();
      }}
    >
      מחיקה
    </button>
  );
}

export function RatesForm({ rates }: { rates: { code: ForeignCurrency; rate: number; updated_at: string }[] }) {
  const [state, action, pending] = useActionState(saveRates, initial);
  const updated = rates.map((row) => row.updated_at).sort().at(-1);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <div>
        <h2 className="text-lg font-extrabold">שערי מטבע</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          כמה דירהם שווה מטבע אחד. זה השער שנכנס אוטומטית בהזמנה חדשה, ואפשר לשנות אותו בכל הזמנה.
          {updated
            ? ` עודכן ${new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Dubai", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(updated))}.`
            : ""}
        </p>
      </div>
      {currencies
        .filter((item) => item.code !== "AED")
        .map((item) => (
          <label key={item.code} className="flex items-center gap-2 text-sm font-bold">
            <span className="w-24 shrink-0">
              {item.flag} 1 {item.symbol} =
            </span>
            <input
              name={item.code}
              required
              inputMode="decimal"
              dir="ltr"
              defaultValue={rates.find((row) => row.code === item.code)?.rate ?? ""}
              className="field field-en min-w-0 flex-1"
            />
            <span className="shrink-0">AED</span>
          </label>
        ))}
      {state?.error ? <p className="text-sm font-bold">{state.error}</p> : null}
      <button disabled={pending} className="button">
        {pending ? "שומרים" : "שמירת השערים"}
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
