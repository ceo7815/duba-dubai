import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("phone_key, phone, full_name")
    .order("full_name", { ascending: true });
  const customers = data ?? [];

  return (
    <Work title="לקוחות" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        הכרטיס נוצר מהטלפון שעל ההזמנה. אין ייבוא. רואים הזמנה אחרונה והזמנה הבאה.
      </p>
      {customers.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted">
          עדיין אין לקוחות. הם נפתחים עם ההזמנה הראשונה.
        </p>
      ) : (
        customers.map((customer) => (
          <Link
            key={customer.phone_key}
            href={`/customers/${customer.phone_key}`}
            className="rounded-2xl border border-line bg-card px-4 py-4"
          >
            <span className="block text-lg font-extrabold">{customer.full_name}</span>
            <span className="mt-1 block text-sm text-muted" dir="ltr">
              {customer.phone}
            </span>
          </Link>
        ))
      )}
    </Work>
  );
}
