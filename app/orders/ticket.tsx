import Link from "next/link";
import { formatWhen } from "@/lib/dates";
import { endingLabels, isEnding, isSource, money, sourceLabels, stageLabels, stageOf } from "@/lib/domain";
import type { OrderItem, OrderRow } from "@/lib/orders";
import { orderMoney } from "@/lib/currency";

export function Ticket({
  order,
  items,
  href,
}: {
  order: OrderRow;
  items?: OrderItem[];
  href?: string;
}) {
  const people = [order.guest_count ? `${order.guest_count} נפשות` : "", order.guest_note]
    .filter(Boolean)
    .join(" – ");
  const body = (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-extrabold">
          {order.is_quote ? "הצעת מחיר · " : ""}
          {order.customer_name}
        </h2>
        <p className="text-sm font-bold">{formatWhen(order.scheduled_at)}</p>
      </div>
      <p className="mt-1 text-sm text-muted">
        {[
          order.destination,
          people,
          order.leaves_at ? `יוצא בשעה ${order.leaves_at}` : "",
          order.phone,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-extrabold ${
          order.allergy === "אין" ? "bg-paper text-ink" : "bg-ink text-white"
        }`}
      >
        אלרגיה: {order.allergy}
      </p>
      {order.special_request ? (
        <p className="mt-3 text-sm leading-6">{order.special_request}</p>
      ) : null}
      {items && items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="size-10 rounded-lg object-cover" />
                ) : null}
                <span>
                  {item.quantity} × {item.name}
                  {Number(item.unit_price) > 0 ? ` × ${Number(item.unit_price)}` : ""}
                </span>
              </span>
              <span>{money(Number(item.quantity) * Number(item.unit_price))}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {order.salad_note ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-6">סלטים להזמנה:{"\n"}{order.salad_note}</p>
      ) : null}
      {Number(order.delivery_fee) > 0 ? (
        <p className="mt-2 text-sm">משלוח {money(Number(order.delivery_fee))}</p>
      ) : null}
      {Number(order.tray_deposit) > 0 ? (
        <p className="mt-2 text-sm">
          פלטה בפיקדון {money(Number(order.tray_deposit))}
          {Number(order.tray_return) > 0 ? ` · בחזרה ${money(Number(order.tray_return))}` : ""}
        </p>
      ) : null}
      <p className="mt-3 text-sm">
        {stageLabels[stageOf(order.status)]}
        {order.ending && isEnding(order.ending) ? ` · ${endingLabels[order.ending]}` : ""}
        {isSource(order.source) ? ` · ${sourceLabels[order.source]}` : ""}
        {order.handled_by ? ` · טיפל/ה: ${order.handled_by}` : ""}
      </p>
      <p className="mt-1 text-sm font-bold">
        שולם {money(Number(order.paid))} מתוך <bdi>{orderMoney(order, Number(order.amount))}</bdi>
      </p>
    </article>
  );

  if (!href) return body;
  return <Link href={href}>{body}</Link>;
}
