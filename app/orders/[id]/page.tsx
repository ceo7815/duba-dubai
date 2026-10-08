import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/app/orders/print-button";
import { SendToChef } from "@/app/orders/send-to-chef";
import { SendToCustomer } from "@/app/orders/send-to-customer";
import { kitchenChef, orderMessage } from "@/lib/kitchen-message";
import { DeleteOrder, Train } from "@/app/orders/stage-switch";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { isSource, money, sourceLabels, stageLabels, stageOf } from "@/lib/domain";
import { getOrder } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { canOperate } from "@/lib/roles";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "accounts" || profile.role === "integrations") redirect("/login");

  const { id } = await params;
  const found = await getOrder(id);
  if (!found) notFound();
  const { order, items } = found;
  const balance = Number(order.amount) - Number(order.paid);
  const inKitchen = ["in_kitchen", "out", "feedback_sent", "paid_shopify"].includes(order.status);
  const arrived =
    order.source === "site"
      ? "הלקוח הזמין ושילם באתר בכרטיס. התשלום מכניס אותה למטבח לבד."
      : "נשלח ללקוח סיכום בוואטסאפ. כשהלקוח מאשר בקישור, ההזמנה נכנסת למטבח לבד.";

  return (
    <Work
      title={stageLabels[stageOf(order.status)]}
      backHref={canOperate(profile?.role) ? "/orders" : "/login"}
      role={profile.role}
    >
      <Ticket order={order} items={items} />
      {canOperate(profile?.role) ? (
        <>
          <p className="text-sm leading-6 text-muted">
            {isSource(order.source) ? `${sourceLabels[order.source]}. ` : ""}
            {arrived}
          </p>
        </>
      ) : null}
      <Train id={order.id} status={order.status} owner={canOperate(profile?.role)} balance={balance} />
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-extrabold">סיכום ללקוח</h2>
        <p className="mt-2 text-sm leading-6">
          {order.customer_name}, {order.phone}. יתרה {money(balance)}.
        </p>
      </section>
      {inKitchen ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-lg font-extrabold">פתק מטבח</h2>
          <p className="mt-2 text-sm leading-6">
            {items.map((item) => `${item.quantity} × ${item.name}`).join(" · ") || "בלי מנות"}
          </p>
          {order.leaves_at ? <p className="mt-2 text-sm font-bold">יוצא בשעה {order.leaves_at}</p> : null}
          <p className="mt-2 text-sm font-extrabold">אלרגיה: {order.allergy}</p>
          {order.special_request ? <p className="mt-2 text-sm leading-6">הערות: {order.special_request}</p> : null}
        </section>
      ) : null}
      {balance > 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-4 text-sm font-bold leading-6">
          {order.ending === "cash"
            ? "מזומן במסירה. לוחצים \"התקבל תשלום\" כשהכסף מגיע מהשליח."
            : "כרטיס. כשהלקוח משלם בקישור התשלום מסומן לבד."}
        </p>
      ) : null}
      <div className="no-print flex flex-col gap-3">
        <PrintButton orderId={order.id} />
        <SendToChef text={orderMessage(order, items)} label={`שליחה ל${kitchenChef.name} בוואטסאפ`} />
        {canOperate(profile?.role) ? (
          <>
            <SendToCustomer orderId={order.id} />
            <Link href={`/orders/${order.id}/edit`} className="button-quiet flex items-center justify-center">
              עריכה
            </Link>
            <DeleteOrder id={order.id} />
          </>
        ) : null}
      </div>
    </Work>
  );
}
