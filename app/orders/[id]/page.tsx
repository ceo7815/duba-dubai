import { notFound, redirect } from "next/navigation";
import { deleteOrder, setOrderStatus } from "@/app/orders/actions";
import { PrintButton } from "@/app/orders/print-button";
import { SendToCustomer } from "@/app/orders/send-to-customer";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { isSource, money, nextSteps, pathFor, pathLabels, sourceLabels, type OrderStatus } from "@/lib/domain";
import { getOrder } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "accounts" || profile.role === "integrations") redirect("/");

  const { id } = await params;
  const found = await getOrder(id);
  if (!found) notFound();
  const { order, items } = found;
  const balance = Number(order.amount) - Number(order.paid);
  const steps = profile.role === "owner" ? nextSteps(order.status, order.source) : [];
  const path = pathFor(order.status, order.source, order.ending);
  const here: OrderStatus = order.status === "paid_shopify" ? "in_kitchen" : order.status;
  const inKitchen = ["in_kitchen", "out", "feedback_sent", "paid_shopify"].includes(order.status);
  const arrived =
    order.source === "shopify"
      ? "נכנסה משופיפיי ישר למטבח, בלי שיחת וואטסאפ."
      : order.source === "bot" || order.source === "owner_chat"
        ? "נכנסה מוואטסאפ. התשלום בסטרייפ מוריד אותה למטבח לבד."
        : "הקלדה. רק הזמנה שלא עברה בוואטסאפ או בשופיפיי.";

  return (
    <Work
      title={
        order.status === "cash_agreed"
          ? "ממתינה לאישור"
          : order.status === "link_sent"
            ? "ממתינה לתשלום"
            : "הזמנה"
      }
      backHref={profile.role === "owner" ? "/orders" : "/"}
      role={profile.role}
    >
      <Ticket order={order} items={items} />
      {profile.role === "owner" ? (
        <>
          <p className="text-sm leading-6 text-muted">
            {isSource(order.source) ? `${sourceLabels[order.source]}. ` : ""}
            {arrived}
          </p>
          <ol className="flex flex-wrap gap-2">
            {path.map((step) => (
              <li
                key={step}
                className={
                  step === here
                    ? "rounded-full bg-[#111111] px-3 py-1 text-sm font-extrabold text-white"
                    : "rounded-full border border-line px-3 py-1 text-sm text-muted"
                }
              >
                {order.source === "shopify" && step === "paid_shopify" ? "שופיפיי" : pathLabels[step]}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-extrabold">סיכום ללקוח</h2>
        <p className="mt-2 text-sm leading-6">
          {order.customer_name}, {order.phone}. יתרה {money(balance)}.
          {order.shopify_url ? ` קישור תשלום: ${order.shopify_url}` : ""}
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
      ) : order.status === "cash_agreed" || order.status === "link_sent" ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-4 text-sm font-bold leading-6">
          {order.status === "cash_agreed"
            ? "הזמנה ממתינה לאישור. המטבח נפתח אחרי שהלקוח לוחץ אישור."
            : "הזמנה ממתינה לתשלום. המטבח נפתח אחרי שהתשלום נכנס."}
        </p>
      ) : null}
      <div className="no-print flex flex-col gap-3">
        <PrintButton />
        {profile.role === "kitchen" && (order.status === "in_kitchen" || order.status === "paid_shopify") ? (
          <form action={setOrderStatus}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="out" />
            <button className="button">יצא</button>
          </form>
        ) : null}
        {profile.role === "owner" ? (
          <>
            <SendToCustomer orderId={order.id} paymentUrl={order.shopify_url} />
            <a href={`/orders/${order.id}/edit`} className="button-quiet flex items-center justify-center">
              עריכה
            </a>
            {order.order_kind === "group_event" ? (
              <p className="text-sm leading-6 text-muted">אירוע קבוצתי לא נסגר לבד. התשלום מסומן כאן, בלחיצה.</p>
            ) : null}
            {steps.map((step) => (
              <form key={step.status} action={setOrderStatus} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value={step.status} />
                {step.status === "link_sent" ? (
                  <input
                    name="payment_url"
                    dir="ltr"
                    placeholder="קישור סטרייפ"
                    defaultValue={order.shopify_url}
                    className="field field-en"
                  />
                ) : null}
                <button className="button">{step.label}</button>
              </form>
            ))}
            <form action={deleteOrder}>
              <input type="hidden" name="id" value={order.id} />
              <button className="button-quiet">מחיקה</button>
            </form>
          </>
        ) : null}
      </div>
    </Work>
  );
}
