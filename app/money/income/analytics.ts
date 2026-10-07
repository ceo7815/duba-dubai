import { addDays } from "@/lib/dates";
import { weekStart } from "@/lib/metrics";

export type IncomeOrder = {
  id: string;
  customer_name: string;
  phone_key: string;
  scheduled_at: string;
  order_kind: string;
  source: string;
  ending: string | null;
  status: string;
  amount: number;
  paid: number;
  day: string;
};

export type Method = "card" | "cash" | "none";
export type Period = "day" | "week" | "month" | "year" | "range";

export const periods: { id: Period; label: string }[] = [
  { id: "day", label: "יום" },
  { id: "week", label: "שבוע" },
  { id: "month", label: "חודש" },
  { id: "year", label: "מתחילת השנה" },
  { id: "range", label: "טווח" },
];

const delivered = new Set(["out", "feedback_sent"]);

export function methodOf(order: IncomeOrder): Method {
  if (order.ending === "cash") return "cash";
  if (order.ending || order.source === "site" || order.paid > 0) return "card";
  return "none";
}

export function receivedOf(order: IncomeOrder) {
  if (order.paid > 0) return order.paid;
  if (order.ending === "cash" && delivered.has(order.status)) return order.amount;
  return 0;
}

export function openOf(order: IncomeOrder) {
  return Math.max(0, order.amount - receivedOf(order));
}

const isKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);

export function lastOfMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return `${key.slice(0, 7)}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
}

function shiftMonths(key: string, by: number) {
  const [year, month, day] = key.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + by, 1));
  const head = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}`;
  const last = Number(lastOfMonth(`${head}-01`).slice(8));
  return `${head}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

export type Window = { period: Period; anchor: string; start: string; end: string };

export function resolveWindow(
  params: { p?: string | string[]; d?: string | string[]; from?: string | string[]; to?: string | string[] },
  today: string,
): Window {
  const period = (periods.some((item) => item.id === params.p) ? params.p : "month") as Period;
  const anchor = isKey(params.d) ? params.d : today;
  if (period === "day") return { period, anchor, start: anchor, end: anchor };
  if (period === "week") {
    const start = weekStart(anchor);
    return { period, anchor, start, end: addDays(start, 6) };
  }
  if (period === "year") {
    const year = anchor.slice(0, 4);
    return { period, anchor, start: `${year}-01-01`, end: `${year}-12-31` };
  }
  if (period === "range") {
    const from = isKey(params.from) ? params.from : `${today.slice(0, 7)}-01`;
    const to = isKey(params.to) ? params.to : today;
    const [start, end] = from <= to ? [from, to] : [to, from];
    return { period, anchor, start, end };
  }
  const start = `${anchor.slice(0, 7)}-01`;
  return { period, anchor, start, end: lastOfMonth(start) };
}

export function stepAnchor(window: Window, by: number) {
  if (window.period === "day") return addDays(window.anchor, by);
  if (window.period === "week") return addDays(window.anchor, by * 7);
  if (window.period === "year") return shiftMonths(window.anchor, by * 12);
  return shiftMonths(window.anchor, by);
}

export function comparison(window: Window, today: string) {
  const end = window.end < today ? window.end : today;
  if (end < window.start) return null;
  if (window.period === "range") {
    const length = daysBetween(window.start, end) + 1;
    return { current: [window.start, end], previous: [addDays(window.start, -length), addDays(window.start, -1)] };
  }
  const shift = (key: string) =>
    window.period === "day"
      ? addDays(key, -1)
      : window.period === "week"
        ? addDays(key, -7)
        : shiftMonths(key, window.period === "year" ? -12 : -1);
  return { current: [window.start, end], previous: [shift(window.start), shift(end)] };
}

export type Totals = { card: number; cash: number; total: number; orders: number; paidOrders: number };

export function totalsOf(orders: IncomeOrder[]): Totals {
  let card = 0;
  let cash = 0;
  let paidOrders = 0;
  for (const order of orders) {
    const value = receivedOf(order);
    if (value <= 0) continue;
    paidOrders += 1;
    if (methodOf(order) === "cash") cash += value;
    else card += value;
  }
  return { card, cash, total: card + cash, orders: orders.length, paidOrders };
}

export type Bucket = { key: string; label: string; card: number; cash: number; href: Window };

export function bucketsOf(window: Window, orders: IncomeOrder[]): Bucket[] {
  if (window.period === "day") return [];
  const monthly = window.period === "year" || daysBetween(window.start, window.end) > 62;
  const buckets = new Map<string, Bucket>();
  if (monthly) {
    for (let key = `${window.start.slice(0, 7)}-01`; key <= window.end; key = shiftMonths(key, 1)) {
      const month = key.slice(0, 7);
      buckets.set(month, {
        key: month,
        label: String(Number(month.slice(5))),
        card: 0,
        cash: 0,
        href: { period: "month", anchor: key, start: key, end: lastOfMonth(key) },
      });
    }
  } else {
    for (let key = window.start; key <= window.end; key = addDays(key, 1)) {
      buckets.set(key, {
        key,
        label: String(Number(key.slice(8))),
        card: 0,
        cash: 0,
        href: { period: "day", anchor: key, start: key, end: key },
      });
    }
  }
  for (const order of orders) {
    const bucket = buckets.get(monthly ? order.day.slice(0, 7) : order.day);
    const value = receivedOf(order);
    if (!bucket || value <= 0) continue;
    if (methodOf(order) === "cash") bucket.cash += value;
    else bucket.card += value;
  }
  return [...buckets.values()];
}

export function groupBy(orders: IncomeOrder[], key: (order: IncomeOrder) => string) {
  const map = new Map<string, { key: string; total: number; count: number }>();
  for (const order of orders) {
    const value = receivedOf(order);
    if (value <= 0) continue;
    const id = key(order);
    const row = map.get(id) ?? { key: id, total: 0, count: 0 };
    row.total += value;
    row.count += 1;
    map.set(id, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
