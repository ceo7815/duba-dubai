import type { Money } from "../data";
import { totalsOf } from "../income/analytics";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function reportFor(data: Money, start: string, end: string) {
  const within = (day: string) => day >= start && day <= end;
  const income = totalsOf(data.orders.filter((order) => within(order.day)));
  const expenses = data.invoices.filter((row) => within(row.happened_on));
  const legacy = data.cash.filter((row) => row.direction !== "in" && within(row.happened_on));

  const byKind = (kind: string) => sum(expenses.filter((row) => row.kind === kind).map((row) => row.amount));
  const byMethod = (method: string) => sum(expenses.filter((row) => row.method === method).map((row) => row.amount));
  const legacyTotal = sum(legacy.map((row) => row.amount));
  const fee = Math.round(income.card * data.fee) / 100;

  const spend = [
    { id: "supplier", label: "ספקים", value: byKind("supplier") },
    { id: "salary", label: "משכורות", value: byKind("salary") },
    { id: "fixed", label: "הוצאות קבועות", value: byKind("fixed") },
    { id: "fee", label: "עמלת סטרייפ", value: fee },
    { id: "other", label: "מזומן והחזרים", value: legacyTotal },
  ].filter((row) => row.value > 0);
  const expenseTotal = sum(spend.map((row) => row.value));

  const payees = new Map<string, { name: string; total: number; count: number }>();
  for (const row of expenses) {
    const key = row.supplier.trim().toLowerCase();
    const entry = payees.get(key) ?? { name: row.supplier.trim(), total: 0, count: 0 };
    entry.total += row.amount;
    entry.count += 1;
    payees.set(key, entry);
  }

  const methods = [
    { id: "transfer", label: "העברה", value: byMethod("transfer") },
    { id: "card", label: "אשראי", value: byMethod("card") },
    { id: "cash", label: "מזומן", value: byMethod("cash") + legacyTotal },
    { id: "cheque", label: "צ׳ק", value: byMethod("cheque") },
  ];

  return {
    income,
    expenseTotal,
    net: income.total - expenseTotal,
    spend,
    methods,
    topPayees: [...payees.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    cashIn: income.cash,
    cashOut: byMethod("cash") + legacyTotal,
  };
}

export type Report = ReturnType<typeof reportFor>;
