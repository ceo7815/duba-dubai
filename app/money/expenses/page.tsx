import type { Metadata } from "next";
import Link from "next/link";
import { deleteExpense, markInvoice } from "@/app/money/actions";
import { ConfirmDelete, ExpenseForm } from "@/app/money/money-forms";
import { Work } from "@/app/shell";
import { dubaiKey, formatDay } from "@/lib/dates";
import { money } from "@/lib/domain";
import { loadMoney, monthTotals, pickMonth, requireMoney } from "../data";
import { expenseKinds, isExpenseKind, kindLabel, methodLabel } from "../expense-types";
import { MonthNav, Totals } from "../parts";

export const metadata: Metadata = { title: "הוצאות · דובה" };

export default async function ExpensesPage({ searchParams }: PageProps<"/money/expenses">) {
  const { profile, owner } = await requireMoney();
  const params = await searchParams;
  const month = pickMonth(params.month);
  const filter = typeof params.kind === "string" && isExpenseKind(params.kind) ? params.kind : null;
  const data = await loadMoney(owner);
  const totals = monthTotals(data, month);
  const monthRows = data.invoices.filter((row) => row.happened_on.startsWith(month));
  const rows = filter ? monthRows.filter((row) => row.kind === filter) : monthRows;
  const filterHref = (kind: string | null) =>
    `/money/expenses?month=${month}${kind ? `&kind=${kind}` : ""}`;

  return (
    <Work title="הוצאות" role={profile.role}>
      <ExpenseForm today={dubaiKey()} />

      <MonthNav path="/money/expenses" month={month} />
      <Totals
        rows={[
          { label: "ספקים", value: totals.suppliers },
          { label: "משכורות", value: totals.salaries },
          { label: "הוצאות קבועות", value: totals.fixed },
          ...(totals.cashOut + totals.refunds > 0
            ? [{ label: "מזומן והחזרים", value: totals.cashOut + totals.refunds }]
            : []),
          ...(owner ? [{ label: "עמלת סטרייפ", value: totals.fee, hint: `${data.fee}% משוער` }] : []),
        ]}
        total={{ label: "סה״כ הוצאות החודש", value: totals.expenses }}
      />

      <section className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5">
          {[{ id: null, short: "הכל" }, ...expenseKinds].map((kind) => {
            const count = kind.id ? monthRows.filter((row) => row.kind === kind.id).length : monthRows.length;
            const active = filter === kind.id;
            return (
              <Link
                key={kind.id ?? "all"}
                href={filterHref(kind.id)}
                className={`flex min-w-0 items-center justify-center gap-1 rounded-full border px-2 py-2 text-[13px] font-extrabold ${
                  active ? "border-ink bg-ink text-white" : "border-line bg-card"
                }`}
              >
                <span className="truncate">{kind.short}</span>
                <span className={`text-xs ${active ? "text-white/60" : "text-muted"}`}>{count}</span>
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            אין הוצאות בחודש הזה
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {rows.map((row) => (
              <article key={row.id} className="border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[11px] font-extrabold">
                        {kindLabel(row.kind)}
                      </span>
                      <span className="truncate text-sm font-extrabold">{row.supplier}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDay(row.happened_on)} · {methodLabel(row.method)}
                    </p>
                    {row.note ? <p className="mt-1 text-xs leading-5">{row.note}</p> : null}
                  </div>
                  <span className="shrink-0 text-base font-extrabold" dir="ltr">
                    {money(row.amount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  {row.sent_to_mali ? (
                    <span className="text-xs font-bold text-muted">נשלח לאילנית ✓</span>
                  ) : (
                    <form action={markInvoice}>
                      <input type="hidden" name="id" value={row.id} />
                      <button className="rounded-full border border-line px-3 py-1 text-xs font-extrabold">
                        סימון שנשלח לאילנית
                      </button>
                    </form>
                  )}
                  {owner ? (
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={row.id} />
                      <ConfirmDelete />
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Work>
  );
}
