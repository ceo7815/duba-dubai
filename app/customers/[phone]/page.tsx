import { notFound, redirect } from "next/navigation";
import { Ticket } from "@/app/orders/ticket";
import { Work } from "@/app/shell";
import { money } from "@/lib/domain";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { OrderRow } from "@/lib/orders";
import { canOperate } from "@/lib/roles";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");

  const { phone } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("phone_key, phone, full_name")
    .eq("phone_key", phone)
    .maybeSingle();
  if (!customer) notFound();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, customer_name, phone, phone_key, scheduled_at, order_kind, fulfillment, destination, guest_count, allergy, special_request, source, ending, status, amount, paid, shopify_url",
    )
    .eq("phone_key", phone)
    .order("scheduled_at", { ascending: true });
  const orders = (data ?? []) as OrderRow[];
  const now = new Date().toISOString();
  const past = orders.filter((order) => order.scheduled_at < now);
  const upcoming = orders.filter((order) => order.scheduled_at >= now);
  const last = past.at(-1) ?? null;
  const next = upcoming[0] ?? null;
  const purchased = orders.reduce((sum, order) => sum + Number(order.amount), 0);

  return (
    <Work title={customer.full_name} backHref="/customers" role={profile.role}>
      <p className="text-sm text-muted" dir="ltr">
        {customer.phone}
      </p>
      <p className="rounded-2xl border border-line bg-card px-4 py-4 text-sm font-extrabold">
        סכום רכישות {money(purchased)}
      </p>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">הזמנה אחרונה</h2>
        {last ? <Ticket order={last} href={`/orders/${last.id}`} /> : <Empty label="אין הזמנה קודמת" />}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">הזמנות עתידיות</h2>
        {upcoming.length === 0 ? (
          <Empty label="אין הזמנה הבאה" />
        ) : (
          upcoming.map((order) => <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />)
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">היסטוריה</h2>
        {past.length === 0 ? (
          <Empty label="אין הזמנות קודמות" />
        ) : (
          [...past].reverse().map((order) => (
            <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />
          ))
        )}
      </section>
    </Work>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">{label}</p>
  );
}
