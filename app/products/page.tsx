import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { money } from "@/lib/domain";
import { dayKey, monthKey, previousMonthKey } from "@/lib/metrics";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { fullAccess } from "@/lib/roles";

export default async function ProductsPage() {
  const profile = await requireProfile();
  if (!fullAccess(profile?.role)) redirect("/login");

  const supabase = await createClient();
  const [orders, itemsResult] = await Promise.all([
    listOrders(),
    supabase.from("order_items").select("name, quantity, unit_price, order_id"),
  ]);
  const orderDay = new Map(orders.map((order) => [order.id, dayKey(order.scheduled_at)]));
  const month = monthKey();
  const previous = previousMonthKey();
  const rows = new Map<string, { quantity: number; revenue: number; previous: number }>();

  for (const item of itemsResult.data ?? []) {
    const day = orderDay.get(item.order_id) ?? "";
    const current = rows.get(item.name) ?? { quantity: 0, revenue: 0, previous: 0 };
    const quantity = Number(item.quantity);
    const revenue = quantity * Number(item.unit_price);
    if (day.startsWith(month)) {
      current.quantity += quantity;
      current.revenue += revenue;
    } else if (day.startsWith(previous)) {
      current.previous += quantity;
    }
    rows.set(item.name, current);
  }

  const list = [...rows.entries()].sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <Work title="מוצרים ומכירות" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        כמה נמכר החודש, כמה כסף זה הכניס, ולעומת החודש הקודם. רווח למנה נמצא בנפרד.
      </p>
      <Link href="/menu" className="text-sm font-bold underline">
        מחירים ועלויות בתפריט
      </Link>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">
          עדיין אין מכירות של מנות.
        </p>
      ) : (
        list.map(([name, row]) => (
          <article key={name} className="rounded-2xl border border-line bg-card px-4 py-4">
            <h2 className="text-lg font-extrabold">{name}</h2>
            <p className="mt-1 text-sm">{row.quantity} יחידות החודש</p>
            <p className="mt-1 text-sm">הכניס {money(row.revenue)}</p>
            <p className="mt-1 text-sm text-muted">חודש קודם {row.previous} יחידות</p>
          </article>
        ))
      )}
    </Work>
  );
}
