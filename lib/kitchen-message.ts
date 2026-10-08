import { formatClock } from "@/lib/dates";
import { fulfillmentLabels, isFulfillment, isOrderKind, money, orderKindLabels, stageOf } from "@/lib/domain";
import type { OrderRow } from "@/lib/orders";

export const kitchenChef = { name: "זוהר", phone: "971559241041" };

type Line = { name: string; quantity: number };
type KitchenOrder = Pick<
  OrderRow,
  | "id"
  | "customer_name"
  | "scheduled_at"
  | "order_kind"
  | "fulfillment"
  | "destination"
  | "guest_count"
  | "guest_note"
  | "leaves_at"
  | "allergy"
  | "special_request"
  | "salad_note"
  | "tray_deposit"
  | "is_quote"
  | "ending"
  | "status"
  | "amount"
  | "paid"
>;

const dayFormat = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Dubai",
  weekday: "long",
  day: "numeric",
  month: "numeric",
});

function orderBlock(order: KitchenOrder, items: Line[]) {
  const number = order.id.slice(0, 6).toUpperCase();
  const kind = isOrderKind(order.order_kind) ? orderKindLabels[order.order_kind] : "";
  const fulfillment = isFulfillment(order.fulfillment) ? fulfillmentLabels[order.fulfillment] : "";
  const people = [order.guest_count ? `${order.guest_count} נפשות` : "", order.guest_note].filter(Boolean).join(" · ");
  const allergic = Boolean(order.allergy) && order.allergy !== "אין";
  const balance = Math.max(0, Number(order.amount) - Number(order.paid));
  const waiting = stageOf(order.status) === "waiting";

  const head = [
    `*${formatClock(order.scheduled_at)} · ${order.customer_name}*${order.is_quote ? " (הצעת מחיר)" : ""}`,
    `הזמנה #${number}${kind ? ` · ${kind}` : ""}`,
    waiting ? "⏳ עדיין ממתין לאישור הלקוח" : "",
    [order.destination, fulfillment].filter(Boolean).join(" · "),
    people ? `👥 ${people}` : "",
    order.leaves_at ? `🚚 יוצא בשעה ${order.leaves_at}` : "",
    allergic ? `⚠️ *אלרגיה: ${order.allergy}*` : "אלרגיה: אין",
    order.special_request ? `📝 ${order.special_request}` : "",
  ].filter(Boolean);
  const dishes = items.length ? items.map((item) => `▫️ ${item.quantity} × ${item.name}`) : ["בלי מנות"];
  const tail = [
    order.salad_note ? `סלטים:\n${order.salad_note}` : "",
    Number(order.tray_deposit) > 0 ? "🍽️ פלטה בפיקדון · להחזיר" : "",
    order.ending === "cash" && balance > 0 ? `💵 לגבות במזומן ${money(balance)}` : "",
  ].filter(Boolean);

  return [head.join("\n"), dishes.join("\n"), tail.join("\n")].filter(Boolean).join("\n\n");
}

export function orderMessage(order: KitchenOrder, items: Line[]) {
  return [`*דובה · הזמנה למטבח*`, dayFormat.format(new Date(order.scheduled_at)), "", orderBlock(order, items)].join("\n");
}

export function dayMessage(orders: KitchenOrder[], items: Map<string, Line[]>) {
  const date = orders[0] ? dayFormat.format(new Date(orders[0].scheduled_at)) : dayFormat.format(new Date());
  const totals = new Map<string, number>();
  for (const order of orders) {
    for (const item of items.get(order.id) ?? []) {
      totals.set(item.name, (totals.get(item.name) ?? 0) + Number(item.quantity));
    }
  }
  const summary = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, quantity]) => `${quantity} × ${name}`);

  return [
    `*דובה · הזמנות ${date}*`,
    `${orders.length} הזמנות`,
    ...orders.map((order) => `\n━━━━━━━━━━\n${orderBlock(order, items.get(order.id) ?? [])}`),
    summary.length ? `\n━━━━━━━━━━\n*סה״כ מנות ליום*\n${summary.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function chefLink(text: string) {
  return `https://wa.me/${kitchenChef.phone}?text=${encodeURIComponent(text)}`;
}
