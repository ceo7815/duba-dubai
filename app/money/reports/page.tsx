import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { FeeForm, RatesForm } from "@/app/money/money-forms";
import { loadRateRows } from "@/lib/rates";
import { Work } from "@/app/shell";
import { dubaiKey } from "@/lib/dates";
import { money } from "@/lib/domain";
import { loadMoney, monthLabel, requireMoney } from "../data";
import { comparison, daysBetween, lastOfMonth, resolveWindow } from "../income/analytics";
import { Delta, hrefFor, PeriodPicker } from "../period-picker";
import { reportFor } from "./report";

export const metadata: Metadata = { title: "דוחות · דובה" };

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const amount = (value: number) => money(Math.abs(value) < 0.005 ? 0 : value);
const tones = ["bg-ink", "bg-[#5e5e5e]", "bg-[#9a9a9a]", "bg-[#c4c4c4]", "bg-[#e0e0e0]"];

export default async function ReportsPage({ searchParams }: PageProps<"/money/reports">) {
  const { profile, owner } = await requireMoney();
  const today = dubaiKey();
  const span = resolveWindow(await searchParams, today);
  const data = await loadMoney(owner);
  const report = reportFor(data, span.start, span.end);

  const compare = comparison(span, today);
  const now = compare ? reportFor(data, compare.current[0], compare.current[1]) : null;
  const before = compare ? reportFor(data, compare.previous[0], compare.previous[1]) : null;
  const cashBox = reportFor(data, "2000-01-01", today);

  const monthly = span.period === "year" || (span.period === "range" && daysBetween(span.start, span.end) > 62);
  const months: { key: string; income: number; expenses: number; net: number }[] = [];
  if (monthly) {
    for (let key = `${span.start.slice(0, 7)}-01`; key <= span.end; ) {
      const month = reportFor(data, key, lastOfMonth(key));
      if (month.income.total > 0 || month.expenseTotal > 0) {
        months.push({ key, income: month.income.total, expenses: month.expenseTotal, net: month.net });
      }
      const [year, mon] = key.split("-").map(Number);
      key = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`;
    }
  }
  const empty = report.income.total === 0 && report.expenseTotal === 0;

  return (
    <Work title="דוחות" role={profile.role}>
      <PeriodPicker basePath="/money/reports" span={span} today={today} />

      <section className="overflow-hidden rounded-3xl bg-[#111111] text-white">
        <div className="flex flex-col gap-3 p-5">
          <SummaryRow
            label="סה״כ הכנסות"
            detail={`אשראי ${amount(report.income.card)} · מזומן ${amount(report.income.cash)}`}
            value={amount(report.income.total)}
            delta={<Delta current={now?.income.total ?? 0} previous={before?.income.total ?? 0} dark />}
          />
          <SummaryRow
            label="סה״כ הוצאות"
            detail={report.spend.map((row) => row.label).join(" · ") || "אין הוצאות"}
            value={report.expenseTotal > 0 ? `− ${amount(report.expenseTotal)}` : amount(0)}
            delta={<Delta current={now?.expenseTotal ?? 0} previous={before?.expenseTotal ?? 0} invert dark />}
          />
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-white/15 bg-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-extrabold">{report.net < 0 ? "הפסד" : "רווח"}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/55">
              {report.income.total > 0 ? <span>{percent(report.net, report.income.total)}% מההכנסות</span> : null}
              <Delta current={now?.net ?? 0} previous={before?.net ?? 0} dark />
            </p>
          </div>
          <p className="shrink-0 text-4xl font-extrabold tracking-tight" dir="ltr">
            {amount(report.net)}
          </p>
        </div>
        {compare ? (
          <p className="px-5 pb-4 text-[11px] text-white/45">
            האחוזים לעומת התקופה המקבילה{span.end > today ? ", עד אותו יום" : ""}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-extrabold">קופת מזומן</p>
            <p className="mt-0.5 text-xs text-muted">כמה מזומן אמור להיות אצלך עכשיו</p>
          </div>
          <p className="text-2xl font-extrabold" dir="ltr">
            {amount(cashBox.cashIn - cashBox.cashOut)}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-sm">
          <p className="text-xs font-bold text-muted">בתקופה</p>
          <Line label="מזומן שנכנס מהזמנות" value={report.cashIn} sign="+" />
          <Line label="הוצאות ששולמו במזומן" value={report.cashOut} sign="−" />
          <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-2 font-extrabold">
            <span>שינוי בקופה</span>
            <span dir="ltr">{amount(report.cashIn - report.cashOut)}</span>
          </div>
        </div>
        {!owner ? <p className="mt-3 text-xs text-muted">מזומן מהזמנות מוצג רק לבעלים.</p> : null}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-extrabold">לאן הכסף הולך</p>
          <p className="text-sm font-extrabold" dir="ltr">
            {amount(report.expenseTotal)}
          </p>
        </div>
        {report.spend.length === 0 ? (
          <p className="mt-3 text-sm text-muted">אין הוצאות בתקופה הזאת.</p>
        ) : (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-paper">
              {report.spend.map((row, index) => (
                <div
                  key={row.id}
                  className={tones[index % tones.length]}
                  style={{ width: `${percent(row.value, report.expenseTotal)}%` }}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {report.spend.map((row, index) => (
                <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-bold">
                    <span className={`size-2.5 shrink-0 rounded-full ${tones[index % tones.length]}`} />
                    {row.label}
                    <span className="font-normal text-muted">{percent(row.value, report.expenseTotal)}%</span>
                  </span>
                  <span className="shrink-0 text-left">
                    <span className="font-extrabold" dir="ltr">
                      {amount(row.value)}
                    </span>
                    {report.income.total > 0 ? (
                      <span className="block text-[11px] text-muted">
                        {percent(row.value, report.income.total)}% מההכנסות
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1.5 border-t border-line pt-3 text-center">
              {report.methods.map((row) => (
                <div key={row.id} className="rounded-xl bg-paper px-1 py-2">
                  <p className="text-[11px] font-bold text-muted">{row.label}</p>
                  <p className="mt-0.5 text-xs font-extrabold" dir="ltr">
                    {amount(row.value)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {report.topPayees.length > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <p className="font-extrabold">למי שילמנו הכי הרבה</p>
          <div className="mt-3 flex flex-col gap-3">
            {report.topPayees.map((row) => (
              <div key={row.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-bold">
                    {row.name} <span className="font-normal text-muted">· {row.count}</span>
                  </span>
                  <span className="shrink-0 font-extrabold" dir="ltr">
                    {amount(row.total)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${percent(row.total, report.topPayees[0].total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {months.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="px-1 text-xs font-bold text-muted">לפי חודשים</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {months.map((row) => (
              <Link
                key={row.key}
                href={hrefFor("/money/reports", {
                  period: "month",
                  anchor: row.key,
                  start: row.key,
                  end: lastOfMonth(row.key),
                })}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-extrabold">{monthLabel(row.key.slice(0, 7))}</p>
                  <p className="mt-0.5 text-xs text-muted" dir="rtl">
                    הכנסות {amount(row.income)} · הוצאות {amount(row.expenses)}
                  </p>
                </div>
                <span className="shrink-0 text-left">
                  <span className="block text-[11px] font-bold text-muted">{row.net < 0 ? "הפסד" : "רווח"}</span>
                  <span className="text-base font-extrabold" dir="ltr">
                    {amount(row.net)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {empty ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          אין עדיין הכנסות או הוצאות בתקופה הזאת. ההכנסות נכנסות לבד מההזמנות, וההוצאות מדף הוצאות.
        </p>
      ) : null}

      <p className="px-1 text-xs leading-5 text-muted">
        ניכוי של {data.withholding}% מהנטו עדיין לא מחושב כאן, עד שאילנית מאשרת מה בדיוק הוא כולל. עמלת סטרייפ מחושבת לפי{" "}
        {data.fee}% מתשלומי האשראי.
        {owner ? "" : " הכנסות מהזמנות מוצגות רק לבעלים."}
      </p>

      {owner ? <RatesForm rates={await loadRateRows()} /> : null}
      {owner ? <FeeForm fee={data.fee} /> : null}
    </Work>
  );
}

function SummaryRow({
  label,
  detail,
  value,
  delta,
}: {
  label: string;
  detail: string;
  value: string;
  delta: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold">
          {label}
          {delta}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-white/45">{detail}</p>
      </div>
      <p className="shrink-0 text-xl font-extrabold" dir="ltr">
        {value}
      </p>
    </div>
  );
}

function Line({ label, value, sign }: { label: string; value: number; sign: "+" | "−" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span>{label}</span>
      <span className="font-bold" dir="ltr">
        {sign} {amount(value)}
      </span>
    </div>
  );
}
