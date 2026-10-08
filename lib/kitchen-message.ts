import { formatClock } from "@/lib/dates";

export const kitchenChef = { name: "זוהר", phone: "971559241041" };

const dayFormat = new Intl.DateTimeFormat("he-IL", {
  timeZone: "Asia/Dubai",
  weekday: "long",
  day: "numeric",
  month: "numeric",
});

type Brief = { customer_name: string; scheduled_at: string };

export function chefIntro(orders: Brief[]) {
  if (orders.length === 1) {
    const [order] = orders;
    return `*דובה · הזמנה למטבח*\n${dayFormat.format(new Date(order.scheduled_at))} · ${formatClock(order.scheduled_at)} · ${order.customer_name}`;
  }
  const date = orders[0] ? dayFormat.format(new Date(orders[0].scheduled_at)) : "";
  const list = orders.map((order) => `▫️ ${formatClock(order.scheduled_at)} · ${order.customer_name}`).join("\n");
  return `*דובה · ${orders.length} הזמנות למטבח*\n${date}\n\n${list}`;
}

export function chefLink(text: string) {
  return `https://wa.me/${kitchenChef.phone}?text=${encodeURIComponent(text)}`;
}
