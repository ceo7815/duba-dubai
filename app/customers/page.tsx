import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { formatWhen } from "@/lib/dates";
import { money } from "@/lib/domain";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { canOperate } from "@/lib/roles";
import { CustomerList, type CustomerCard } from "./customer-list";

export default async function CustomersPage() {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");

  const supabase = await createClient();
  const [{ data }, { data: orderRows }] = await Promise.all([
    supabase.from("customers").select("phone_key, phone, full_name, created_at"),
    supabase.from("orders").select("phone_key, customer_name, destination, scheduled_at, amount"),
  ]);
  const now = new Date().toISOString();

  const customers: CustomerCard[] = (data ?? []).map((customer) => {
    const orders = (orderRows ?? [])
      .filter((order) => order.phone_key === customer.phone_key)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const last = orders.filter((order) => order.scheduled_at < now).at(-1);
    const next = orders.find((order) => order.scheduled_at >= now);
    const total = orders.reduce((sum, order) => sum + Number(order.amount), 0);
    const words = new Set([
      ...orders.map((order) => order.customer_name),
      ...orders.map((order) => order.destination),
    ]);
    return {
      key: customer.phone_key,
      name: customer.full_name,
      phone: customer.phone,
      orders: orders.length,
      total: total > 0 ? money(total) : "",
      last: last ? formatWhen(last.scheduled_at) : "",
      next: next ? formatWhen(next.scheduled_at) : "",
      activity: orders.at(-1)?.scheduled_at ?? customer.created_at,
      search: [...words].filter(Boolean).join(" "),
    };
  });

  return (
    <Work title="לקוחות" role={profile.role}>
      {customers.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">
          עדיין אין לקוחות. הם נפתחים עם ההזמנה הראשונה.
        </p>
      ) : (
        <CustomerList customers={customers} />
      )}
    </Work>
  );
}
