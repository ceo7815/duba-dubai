import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { summaryDescription } from "@/lib/og-summary";
import { aed } from "@/lib/store/i18n";
import { getDict } from "@/lib/store/lang";
import { section } from "../../ui";

export const metadata: Metadata = {
  title: "Your order summary",
  description: `Your Duba Dubai order – dishes, time and payment. ${summaryDescription}`,
  openGraph: {
    title: "Your order summary · סיכום ההזמנה שלך",
    description: `Your Duba Dubai order – dishes, time and payment. ${summaryDescription}`,
  },
  robots: { index: false, follow: false },
};

type SiteOrder = {
  customer_name: string;
  scheduled_at: string;
  fulfillment: string;
  destination: string;
  amount: number;
  paid: number;
  delivery_fee: number;
  status: string;
  payment_url: string;
  items: { name: string; quantity: number; unit_price: number }[];
};

export default async function OrderPage({ params, searchParams }: PageProps<"/shop/order/[token]">) {
  const { token } = await params;
  const { paid: returned } = await searchParams;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await supabase.rpc("order_for_guest", { lookup: token });
  const order = data as SiteOrder | null;
  if (!order?.customer_name) notFound();
  const { lang, t } = await getDict();

  const amount = Number(order.amount);
  const settled = Number(order.paid) >= amount || ["in_kitchen", "out", "feedback_sent", "paid_shopify"].includes(order.status);
  const status = settled ? t.paidKitchen : returned === "1" ? t.confirming : order.payment_url ? t.payPending : t.payLater;
  const when = new Intl.DateTimeFormat(lang === "he" ? "he-IL" : "en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(order.scheduled_at));

  return (
    <main className={`${section} min-h-[70dvh] px-5 py-10 md:px-12`}>
      <div className="mx-auto max-w-xl">
        <p className="text-5xl">✓</p>
        <h1 className="mt-4 text-3xl font-semibold md:text-[40px]">{t.thanks}</h1>
        <p className="mt-2 text-white/75">
          {order.customer_name} · {t.received}
        </p>
        <p className={`mt-6 rounded-lg px-4 py-3 font-semibold ${settled ? "bg-[#3d8b40]" : "bg-white/10"}`}>{status}</p>
        {!settled && order.payment_url && returned !== "1" ? (
          <a href={order.payment_url} className="mt-4 flex min-h-14 items-center justify-center rounded-lg bg-white text-lg font-semibold text-black">
            {t.pay} · <bdi dir="ltr">&nbsp;{aed(amount)}</bdi>
          </a>
        ) : null}

        <dl className="mt-8 space-y-3 border-t border-white/15 pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-white/65">{t.orderNumber}</dt>
            <dd dir="ltr">#{token.slice(0, 6).toUpperCase()}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/65">{t.scheduled}</dt>
            <dd>{when}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/65">{order.fulfillment === "pickup" ? t.pickup : t.delivery}</dt>
            <dd className="text-end">{order.fulfillment === "pickup" ? t.pickupFree : order.destination}</dd>
          </div>
        </dl>

        <ul className="mt-6 divide-y divide-white/10 border-y border-white/15 text-sm">
          {(order.items ?? []).map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex justify-between gap-4 py-2.5">
              <span className={item.name.startsWith("↳") ? "ps-4 text-white/60" : ""}>
                {item.quantity}× {item.name}
              </span>
              {Number(item.unit_price) > 0 ? (
                <bdi dir="ltr" className="shrink-0 tabular-nums">
                  {aed(Number(item.unit_price) * Number(item.quantity))}
                </bdi>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 text-sm">
          {Number(order.delivery_fee) > 0 ? (
            <div className="flex justify-between">
              <span className="text-white/65">{t.delivery}</span>
              <bdi dir="ltr">{aed(Number(order.delivery_fee))}</bdi>
            </div>
          ) : null}
          <div className="flex justify-between text-lg font-semibold">
            <span>{t.total}</span>
            <bdi dir="ltr">{aed(amount)}</bdi>
          </div>
        </div>

        <p className="mt-8 text-sm text-white/65">
          <a href="https://wa.me/971559060717" className="underline" target="_blank" rel="noreferrer">
            {t.contactUs}
          </a>
        </p>
        <Link href="/shop" className="mt-6 inline-flex rounded-lg border border-white px-8 py-3 font-semibold">
          {t.continueShopping}
        </Link>
      </div>
    </main>
  );
}
