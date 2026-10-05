import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { dubaiDayRange, formatClock } from "@/lib/dates";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";

export default async function TodayPage() {
  const profile = await requireProfile();
  if (profile.role === "accounts") redirect("/money");
  if (profile.role === "integrations") redirect("/connections");

  const { start, end } = dubaiDayRange();
  const orders = await listOrders();
  const today = orders.filter(
    (order) => order.scheduled_at >= start && order.scheduled_at < end,
  );
  const kitchen = today.filter(
    (order) => order.status === "in_kitchen" || order.status === "paid_shopify" || order.status === "out",
  );
  const waiting =
    profile.role === "owner"
      ? orders.filter(
          (order) =>
            order.status === "awaiting" ||
            order.status === "link_sent" ||
            order.status === "cash_agreed" ||
            order.status === "paid_shopify",
        )
      : [];

  return (
    <Work title="היום" role={profile.role}>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">היום במטבח</h2>
        {kitchen.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">
            אין פתקים להיום.
          </p>
        ) : (
          kitchen.map((order) => (
            <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />
          ))
        )}
      </section>
      {profile.role === "owner" ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">מה שמחכה</h2>
            <Link href="/orders/new" className="text-sm font-bold underline">
              הזמנה חדשה
            </Link>
          </div>
          {waiting.length === 0 ? (
            <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">
              אין הזמנה שאושרה ועוד לא נכנסה למטבח.
            </p>
          ) : (
            waiting.map((order) => (
              <div key={order.id} className="flex flex-col gap-1">
                <p className="text-sm font-bold text-muted">{formatClock(order.scheduled_at)}</p>
                <Ticket order={order} href={`/orders/${order.id}`} />
              </div>
            ))
          )}
        </section>
      ) : null}
    </Work>
  );
}
