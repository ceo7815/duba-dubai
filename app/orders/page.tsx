import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";

export default async function OrdersPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const orders = await listOrders();

  return (
    <Work title="הזמנות" role={profile.role}>
      <Link href="/orders/new" className="button flex items-center justify-center">
        הזמנה חדשה
      </Link>
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">
          עדיין אין הזמנות. וואטסאפ ושופיפיי ייכנסו לכאן לבד. הקלדה היא רק למה שלא עבר שם.
        </p>
      ) : (
        orders.map((order) => (
          <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />
        ))
      )}
    </Work>
  );
}
