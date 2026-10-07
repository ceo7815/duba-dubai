import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { dayKey, monthKey } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { methodOf, receivedOf, type IncomeOrder } from "./income/analytics";
import { fullAccess } from "@/lib/roles";

export type Cash = {
  id: string;
  direction: string;
  amount: number;
  note: string;
  happened_on: string;
};
export type Invoice = {
  id: string;
  supplier: string;
  amount: number;
  note: string;
  sent_to_mali: boolean;
  happened_on: string;
  kind: string;
  method: string;
};
export type PaidOrder = IncomeOrder & { month: string };

export async function requireMoney() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role) && profile.role !== "accounts")
    redirect("/login");
  return { profile, owner: fullAccess(profile?.role) };
}

export function pickMonth(value: string | string[] | undefined) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : monthKey();
}

export function shiftMonth(month: string, by: number) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-15T00:00:00Z`));
}

export async function loadMoney(owner: boolean) {
  const supabase = await createClient();
  const [
    { data: cash },
    { data: invoices },
    { data: settings },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from("cash_entries")
      .select("id, direction, amount, note, happened_on")
      .order("happened_on", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, supplier, amount, note, sent_to_mali, happened_on, kind, method")
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("business_settings")
      .select("stripe_fee_percent, withholding_percent")
      .eq("id", 1)
      .maybeSingle(),
    owner
      ? supabase
          .from("orders")
          .select(
            "id, customer_name, phone_key, scheduled_at, order_kind, source, status, ending, amount, paid",
          )
          .neq("status", "draft")
          .not("is_quote", "is", true)
          .order("scheduled_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const orderRows: PaidOrder[] = (
    (orders ?? []) as Omit<PaidOrder, "month" | "day">[]
  ).map((row) => {
    const day = dayKey(row.scheduled_at);
    return {
      ...row,
      amount: Number(row.amount),
      paid: Number(row.paid),
      day,
      month: monthKey(day),
    };
  });

  return {
    cash: ((cash ?? []) as Cash[]).map((row) => ({
      ...row,
      amount: Number(row.amount),
    })),
    invoices: ((invoices ?? []) as Invoice[]).map((row) => ({
      ...row,
      amount: Number(row.amount),
    })),
    orders: orderRows,
    fee: Number(settings?.stripe_fee_percent ?? 2.9),
    withholding: Number(settings?.withholding_percent ?? 5),
  };
}

export type Money = Awaited<ReturnType<typeof loadMoney>>;

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

export function monthTotals(data: Money, month: string) {
  const cash = data.cash.filter((row) => row.happened_on.startsWith(month));
  const orders = data.orders.filter((row) => row.month === month);
  const ordersPaid = sum(orders.map(receivedOf));
  const cashOut = sum(
    cash.filter((row) => row.direction === "out").map((row) => row.amount),
  );
  const refunds = sum(
    cash.filter((row) => row.direction === "refund").map((row) => row.amount),
  );
  const monthInvoices = data.invoices.filter((row) =>
    row.happened_on.startsWith(month),
  );
  const invoices = sum(monthInvoices.map((row) => row.amount));
  const byKind = (kind: string) =>
    sum(
      monthInvoices.filter((row) => row.kind === kind).map((row) => row.amount),
    );
  const cardPaid = sum(
    orders.filter((row) => methodOf(row) === "card").map(receivedOf),
  );
  const fee = Math.round(cardPaid * data.fee) / 100;
  const income = ordersPaid;
  const expenses = invoices + cashOut + refunds + fee;
  const expected = sum(
    orders
      .filter((row) => row.status === "link_sent")
      .map((row) => Math.max(0, row.amount - row.paid)),
  );
  return {
    ordersPaid,
    cashOut,
    refunds,
    invoices,
    suppliers: byKind("supplier"),
    salaries: byKind("salary"),
    fixed: byKind("fixed"),
    fee,
    income,
    expenses,
    net: income - expenses,
    expected,
  };
}
