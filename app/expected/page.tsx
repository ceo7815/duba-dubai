import { redirect } from "next/navigation";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { addDays, dubaiKey } from "@/lib/dates";
import { money, orderKindLabels, isOrderKind } from "@/lib/domain";
import { inDays } from "@/lib/metrics";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { fullAccess } from "@/lib/roles";

const eventKinds = new Set(["group_event", "holiday", "hosting", "shabbat_couple", "shabbat_family"]);

export default async function ExpectedPage() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect("/login");

  const orders = await listOrders();
  const start = dubaiKey();
  const end = addDays(start, 7);
  const nextWeek = orders.filter((order) => inDays(order.scheduled_at, start, end));
  const expected = orders
    .filter((order) => order.status === "link_sent")
    .reduce((sum, order) => sum + Math.max(0, Number(order.amount) - Number(order.paid)), 0);
  const events = orders.filter(
    (order) => order.scheduled_at >= new Date().toISOString() && eventKinds.has(order.order_kind),
  );
  const unpaid = orders.filter(
    (order) => Number(order.amount) > Number(order.paid) && order.status !== "draft",
  );

  return (
    <Work title="מה צפוי" role={profile.role}>
      <section className="rounded-2xl border border-line bg-card px-4 py-4">
        <p className="text-sm text-muted">סגור לשבוע הקרוב</p>
        <p className="mt-1 text-2xl font-extrabold">{nextWeek.length} הזמנות</p>
        <p className="mt-2 text-sm font-bold">צפוי מקישור סטרייפ {money(expected)}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">אירועים וקייטרינג קרובים</h2>
        {events.length === 0 ? (
          <Empty label="אין אירוע או קייטרינג קרוב." />
        ) : (
          events.map((order) => (
            <div key={order.id} className="flex flex-col gap-1">
              <p className="text-sm font-bold text-muted">
                {isOrderKind(order.order_kind) ? orderKindLabels[order.order_kind] : order.order_kind}
              </p>
              <Ticket order={order} href={`/orders/${order.id}`} />
            </div>
          ))
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">עדיין לא שולם</h2>
        {unpaid.length === 0 ? (
          <Empty label="אין יתרה פתוחה." />
        ) : (
          unpaid.map((order) => <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />)
        )}
      </section>
    </Work>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">{label}</p>;
}
