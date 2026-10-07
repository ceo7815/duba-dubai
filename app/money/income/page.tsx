import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { dubaiKey, formatDay, formatWhen } from "@/lib/dates";
import { money, orderKindLabels, sourceLabels } from "@/lib/domain";
import { requireProfile } from "@/lib/profile";
import { loadMoney, monthLabel } from "../data";
import {
  bucketsOf,
  comparison,
  groupBy,
  methodOf,
  openOf,
  receivedOf,
  resolveWindow,
  totalsOf,
  type Bucket,
  type IncomeOrder,
  type Method,
} from "./analytics";
import { hrefFor, PeriodPicker, shortDate } from "../period-picker";
import { fullAccess } from "@/lib/roles";

export const metadata: Metadata = { title: "הכנסות · דובה" };

const methodLabels: Record<Method, string> = { card: "אשראי", cash: "מזומן", none: "לא נבחר" };

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default async function IncomePage({ searchParams }: PageProps<"/money/income">) {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect(profile.role === "accounts" ? "/money/expenses" : "/login");

  const today = dubaiKey();
  const span = resolveWindow(await searchParams, today);
  const data = await loadMoney(true);
  const all = data.orders;
  const inWindow = (from: string, to: string) => all.filter((order) => order.day >= from && order.day <= to);
  const orders = inWindow(span.start, span.end).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const totals = totalsOf(orders);

  const compare = comparison(span, today);
  const current = compare ? totalsOf(inWindow(compare.current[0], compare.current[1])).total : 0;
  const previous = compare ? totalsOf(inWindow(compare.previous[0], compare.previous[1])).total : 0;
  const delta = compare && previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  const open = orders.filter((order) => openOf(order) > 0);
  const openBy = (method: Method) =>
    open.filter((order) => methodOf(order) === method).reduce((sum, order) => sum + openOf(order), 0);
  const openTotal = openBy("card") + openBy("cash") + openBy("none");

  const buckets = bucketsOf(span, orders);
  const byKind = groupBy(orders, (order) => order.order_kind);
  const bySource = groupBy(orders, (order) => order.source);
  const byCustomer = groupBy(orders, (order) => order.phone_key || order.customer_name).slice(0, 5);
  const customerName = (key: string) =>
    orders.find((order) => (order.phone_key || order.customer_name) === key)?.customer_name || "ללא שם";

  return (
    <Work title="הכנסות" role={profile.role}>
      <PeriodPicker basePath="/money/income" span={span} today={today} />

      <section className="rounded-3xl bg-[#111111] p-5 text-white">
        <p className="text-sm font-bold text-white/60">נכנס בתקופה</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight" dir="ltr">
          {money(totals.total)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
          {delta !== null ? (
            <span className={`rounded-full px-2.5 py-1 ${delta >= 0 ? "bg-white text-[#111111]" : "bg-white/15 text-white"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% מהתקופה המקבילה
            </span>
          ) : compare && previous === 0 && current > 0 ? (
            <span className="rounded-full bg-white/15 px-2.5 py-1">אין נתונים לתקופה המקבילה</span>
          ) : null}
          <span className="text-white/60">
            {totals.paidOrders} הזמנות שולמו
            {totals.paidOrders > 0 ? ` · ממוצע ${money(Math.round(totals.total / totals.paidOrders))}` : ""}
          </span>
        </div>

        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="bg-white" style={{ width: `${percent(totals.card, totals.total)}%` }} />
          <div className="bg-white/45" style={{ width: `${percent(totals.cash, totals.total)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Split label="אשראי" tone="bg-white" value={totals.card} share={percent(totals.card, totals.total)} />
          <Split label="מזומן" tone="bg-white/45" value={totals.cash} share={percent(totals.cash, totals.total)} />
        </div>
      </section>

      {openTotal > 0 ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-extrabold">עוד לא נכנס</p>
            <p className="text-lg font-extrabold" dir="ltr">
              {money(openTotal)}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <OpenCell label="אשראי ממתין" value={openBy("card")} />
            <OpenCell label="מזומן לגבייה" value={openBy("cash")} />
            <OpenCell label="בלי אמצעי" value={openBy("none")} />
          </div>
        </section>
      ) : null}

      {buckets.length > 1 ? <Chart buckets={buckets} today={today} /> : null}

      {totals.total > 0 ? (
        <div className="grid gap-3">
          <Breakdown
            title="לפי סוג הזמנה"
            rows={byKind.map((row) => ({
              label: orderKindLabels[row.key as keyof typeof orderKindLabels] ?? row.key,
              ...row,
            }))}
            total={totals.total}
          />
          <Breakdown
            title="לפי מקור"
            rows={bySource.map((row) => ({
              label: sourceLabels[row.key as keyof typeof sourceLabels] ?? row.key,
              ...row,
            }))}
            total={totals.total}
          />
          <Breakdown
            title="הלקוחות המובילים"
            rows={byCustomer.map((row) => ({ label: customerName(row.key), ...row }))}
            total={totals.total}
          />
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <p className="px-1 text-xs font-bold text-muted">הזמנות בתקופה · {orders.length}</p>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
            <p className="font-extrabold">אין הזמנות בתקופה הזאת</p>
            <p className="mt-1 text-sm text-muted">ההכנסות מתעדכנות לבד מתוך ההזמנות, אשראי ומזומן.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {orders.map((order) => (
              <OrderLine key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <p className="px-1 text-xs leading-5 text-muted">
        הכנסה נרשמת לפי יום האירוע. אשראי נספר כשהתשלום נכנס, ומזומן נספר כשההזמנה יצאה ללקוח או סומנה כשולמה.
      </p>
    </Work>
  );
}

function Split({ label, tone, value, share }: { label: string; tone: string; value: number; share: number }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold text-white/60">
        <span className={`size-2 rounded-full ${tone}`} />
        {label} · {share}%
      </p>
      <p className="mt-0.5 text-lg font-extrabold" dir="ltr">
        {money(value)}
      </p>
    </div>
  );
}

function OpenCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-paper px-2 py-2.5">
      <p className="text-[11px] font-bold text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold" dir="ltr">
        {money(value)}
      </p>
    </div>
  );
}

function Chart({ buckets, today }: { buckets: Bucket[]; today: string }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.card + bucket.cash));
  const monthly = buckets[0]?.href.period === "month";
  const showLabel = (index: number, label: string) =>
    buckets.length <= 12 || index === 0 || index === buckets.length - 1 || Number(label) % 5 === 0;
  const best = buckets.reduce((top, bucket) => (bucket.card + bucket.cash > top.card + top.cash ? bucket : top));

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-extrabold">{monthly ? "לפי חודשים" : "לפי ימים"}</p>
        <div className="flex items-center gap-3 text-[11px] font-bold text-muted">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-ink" /> אשראי
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#b5b5b5]" /> מזומן
          </span>
        </div>
      </div>
      <div className="mt-4 flex h-36 items-end gap-[3px]" dir="ltr">
        {buckets.map((bucket) => {
          const total = bucket.card + bucket.cash;
          const isToday = monthly ? today.startsWith(bucket.key) : bucket.key === today;
          return (
            <Link
              key={bucket.key}
              href={hrefFor("/money/income", bucket.href)}
              title={`${monthly ? monthLabel(bucket.key) : shortDate(bucket.key)} · ${money(total)}`}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <div
                className={`flex w-full flex-col-reverse overflow-hidden rounded-t-[5px] ${total === 0 ? "bg-[#ececec]" : ""} ${
                  isToday ? "ring-2 ring-ink ring-offset-1" : ""
                } group-hover:opacity-80`}
                style={{ height: total === 0 ? 3 : `${Math.max(4, (total / max) * 100)}%` }}
              >
                <div className="bg-ink" style={{ height: `${percent(bucket.card, total)}%` }} />
                <div className="bg-[#b5b5b5]" style={{ height: `${percent(bucket.cash, total)}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px]" dir="ltr">
        {buckets.map((bucket, index) => (
          <span key={bucket.key} className="min-w-0 flex-1 text-center text-[10px] font-bold text-muted">
            {showLabel(index, bucket.label) ? bucket.label : ""}
          </span>
        ))}
      </div>
      {best.card + best.cash > 0 ? (
        <p className="mt-3 text-xs text-muted">
          השיא: {monthly ? monthLabel(best.key) : formatDay(best.key)} · {money(best.card + best.cash)}
        </p>
      ) : null}
    </section>
  );
}

function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { key: string; label: string; total: number; count: number }[];
  total: number;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <p className="font-extrabold">{title}</p>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-bold">
                {row.label} <span className="font-normal text-muted">· {row.count}</span>
              </span>
              <span className="shrink-0 font-extrabold" dir="ltr">
                {money(row.total)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full bg-ink" style={{ width: `${percent(row.total, total)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderLine({ order }: { order: IncomeOrder }) {
  const method = methodOf(order);
  const received = receivedOf(order);
  const open = openOf(order);
  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold">{order.customer_name || "ללא שם"}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
              method === "card" ? "bg-ink text-white" : method === "cash" ? "bg-[#e3e3e3] text-ink" : "border border-line"
            }`}
          >
            {methodLabels[method]}
          </span>
          {formatWhen(order.scheduled_at)}
        </p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-sm font-extrabold" dir="ltr">
          {money(received)}
        </p>
        {open > 0 ? (
          <p className="text-[11px] font-bold text-muted" dir="ltr">
            {money(open)} פתוח
          </p>
        ) : null}
      </div>
    </Link>
  );
}
