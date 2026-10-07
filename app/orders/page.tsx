import { redirect } from "next/navigation";
import { DayCard } from "@/app/today/day-card";
import { Work } from "@/app/shell";
import { addDays, dubaiKey, formatClock, formatDay } from "@/lib/dates";
import { money, stageOf } from "@/lib/domain";
import { dayKey, weekStart } from "@/lib/metrics";
import { itemsByOrder, listOrders, type OrderRow } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { OrderFilters, type OrderQuery } from "./filters";
import { canOperate } from "@/lib/roles";

const ranges = ["today", "tomorrow", "week"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");

  const params = await searchParams;
  const read = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const query: OrderQuery = {
    q: read("q").slice(0, 80),
    range: ranges.includes(read("range")) ? read("range") : "",
    from: datePattern.test(read("from")) ? read("from") : "",
    to: datePattern.test(read("to")) ? read("to") : "",
    stage: ["waiting", "kitchen", "out"].includes(read("stage")) ? read("stage") : "",
  };

  const today = dubaiKey();
  const thisWeek = weekStart(today);
  const text = query.q.toLowerCase();
  const digits = query.q.replace(/\D/g, "").replace(/^0+/, "");

  const inRange = (day: string) => {
    if (query.from || query.to) return (!query.from || day >= query.from) && (!query.to || day <= query.to);
    if (query.range === "today") return day === today;
    if (query.range === "tomorrow") return day === addDays(today, 1);
    if (query.range === "week") return day >= thisWeek && day < addDays(thisWeek, 7);
    return text.length > 0 || day >= today;
  };
  const matches = (order: OrderRow) =>
    !text ||
    order.customer_name.toLowerCase().includes(text) ||
    order.destination.toLowerCase().includes(text) ||
    order.id.toLowerCase().startsWith(text) ||
    (digits.length >= 3 && order.phone_key.includes(digits));

  const orders = (await listOrders()).filter((order) => {
    if (order.status === "draft") return false;
    return (
      inRange(dayKey(order.scheduled_at)) &&
      matches(order) &&
      (!query.stage || stageOf(order.status) === query.stage)
    );
  });

  const groups = new Map<string, OrderRow[]>();
  for (const order of orders) {
    const day = dayKey(order.scheduled_at);
    groups.set(day, [...(groups.get(day) ?? []), order]);
  }
  const items = await itemsByOrder(orders.slice(0, 150).map((order) => order.id));
  const total = orders.reduce((sum, order) => sum + Number(order.amount), 0);
  const debt = orders.reduce((sum, order) => sum + Math.max(0, Number(order.amount) - Number(order.paid)), 0);
  const now = requestTime();

  return (
    <Work title="הזמנות" role={profile.role}>
      <OrderFilters query={query} />

      <div className="flex items-center justify-between px-1 text-sm font-bold text-muted">
        <span>{orders.length} הזמנות</span>
        <span>
          {money(total)}
          {debt > 0 ? ` · חוב ${money(debt)}` : ""}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          לא נמצאו הזמנות.
        </p>
      ) : (
        [...groups.entries()].map(([day, list]) => (
          <section key={day} className="flex flex-col gap-3">
            <h2 className="mt-1 px-1 text-base font-extrabold">
              {day === today ? "היום · " : day === addDays(today, 1) ? "מחר · " : ""}
              {formatDay(day)}
            </h2>
            {list.map((order) => (
              <DayCard
                key={order.id}
                order={order}
                time={formatClock(order.scheduled_at)}
                items={items.get(order.id) ?? []}
                owner
                late={stageOf(order.status) !== "out" && new Date(order.scheduled_at).getTime() < now}
              />
            ))}
          </section>
        ))
      )}
    </Work>
  );
}

function requestTime() {
  return Date.now();
}
