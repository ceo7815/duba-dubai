import { redirect } from "next/navigation";
import { Questions } from "@/app/grok/questions";
import { Work } from "@/app/shell";
import { addDays, dubaiKey } from "@/lib/dates";
import { money } from "@/lib/domain";
import { inDays } from "@/lib/metrics";
import { listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function GrokPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const supabase = await createClient();
  const [orders, itemsResult] = await Promise.all([
    listOrders(),
    supabase.from("order_items").select("name, quantity"),
  ]);
  const start = dubaiKey();
  const week = orders.filter((order) => inDays(order.scheduled_at, start, addDays(start, 7)));
  const expected = orders
    .filter((order) => order.status === "link_sent")
    .reduce((sum, order) => sum + Math.max(0, Number(order.amount) - Number(order.paid)), 0);

  const byCustomer = new Map<string, number>();
  for (const order of orders) {
    byCustomer.set(order.customer_name, (byCustomer.get(order.customer_name) ?? 0) + Number(order.amount));
  }
  const topCustomer = [...byCustomer.entries()].sort((a, b) => b[1] - a[1])[0];

  const byProduct = new Map<string, number>();
  for (const item of itemsResult.data ?? []) {
    byProduct.set(item.name, (byProduct.get(item.name) ?? 0) + Number(item.quantity));
  }
  const topProduct = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <Work title="Grok" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        התשובות כאן מחושבות מההזמנות שכבר במערכת. וואטסאפ ושופיפיי עדיין לא מחוברים. כשיהיו, שניהם יכתבו לאותה הזמנה והתשלום יוריד אותה למטבח.
      </p>
      <Questions
        items={[
          {
            question: "כמה הזמנות יש השבוע",
            answer: week.length === 0 ? "אין הזמנות בשבעת הימים הקרובים." : `יש ${week.length} הזמנות בשבעת הימים הקרובים.`,
          },
          {
            question: "כמה כסף צפוי להיכנס",
            answer: `מקישורי שופיפיי שעוד לא שולמו צפויים ${money(expected)}.`,
          },
          {
            question: "מי הלקוח שקנה הכי הרבה",
            answer: topCustomer
              ? `${topCustomer[0]} עם רכישות של ${money(topCustomer[1])}.`
              : "עדיין אין לקוחות עם הזמנות.",
          },
          {
            question: "מה המוצר הכי נמכר",
            answer: topProduct
              ? `${topProduct[0]}, ${topProduct[1]} יחידות.`
              : "עדיין אין מנות על הזמנות.",
          },
        ]}
      />
    </Work>
  );
}
