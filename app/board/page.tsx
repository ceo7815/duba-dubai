import { redirect } from "next/navigation";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { addDays, dubaiKey, formatDay } from "@/lib/dates";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";

export default async function BoardPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const today = dubaiKey();
  const yesterday = addDays(today, -1);
  const days = Array.from({ length: 22 }, (_, index) => addDays(yesterday, index));
  const orders = await listOrders();
  const later = orders.filter((order) => dubaiKey(new Date(order.scheduled_at)) > days[days.length - 1]);

  return (
    <Work title="לוח" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        הזמנה לשבוע הבא נשארת ביום שלה. חמישי ושישי הם העומס.
      </p>
      {days.map((day) => {
        const rows = orders.filter((order) => dubaiKey(new Date(order.scheduled_at)) === day);
        const title =
          day === yesterday ? `אתמול · ${formatDay(day)}` : day === today ? `היום · ${formatDay(day)}` : formatDay(day);
        return (
          <section id={`day-${day}`} key={day} className="flex scroll-mt-24 flex-col gap-2">
            <h2 className="text-base font-extrabold">{title}</h2>
            {rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
                אין הזמנות
              </p>
            ) : (
              rows.map((order) => (
                <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />
              ))
            )}
          </section>
        );
      })}
      {later.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-extrabold">אחר כך</h2>
          {later.map((order) => (
            <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />
          ))}
        </section>
      ) : null}
    </Work>
  );
}
