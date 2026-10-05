import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ConfirmOrder } from "@/app/o/confirm-order";
import { PrintSheet } from "@/app/o/print-sheet";
import { formatClock } from "@/lib/dates";
import { money } from "@/lib/domain";
import { foodTotal, lineTotal, type SheetItem } from "@/lib/sheet";

type GuestItem = SheetItem & { image_url?: string };

export const metadata: Metadata = {
  title: "ההזמנה שלך · דובה",
  robots: { index: false, follow: false },
};

type GuestOrder = {
  customer_name: string;
  phone: string;
  scheduled_at: string;
  order_kind: string;
  fulfillment: string;
  destination: string;
  guest_count: number | null;
  guest_note: string;
  leaves_at: string;
  allergy: string;
  special_request: string;
  amount: number;
  paid: number;
  delivery_fee: number;
  tray_deposit: number;
  tray_return: number;
  salad_note: string;
  is_quote: boolean;
  ending: string;
  status: string;
  payment_url: string;
  items: GuestItem[];
};

export default async function GuestOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data } = await supabase.rpc("order_for_guest", { lookup: token });
  const order = data as GuestOrder | null;
  if (!order?.customer_name) notFound();

  const amount = Number(order.amount);
  const paid = Number(order.paid);
  const delivery = Number(order.delivery_fee ?? 0);
  const deposit = Number(order.tray_deposit ?? 0);
  const returned = Number(order.tray_return ?? 0);
  const food = foodTotal(order.items ?? []);
  const settled = amount > 0 && paid >= amount;
  const cash = order.ending === "cash";
  const inKitchen = ["in_kitchen", "out", "feedback_sent", "paid_shopify"].includes(order.status);
  const action =
    cash && order.status === "cash_agreed" ? (
      <ConfirmOrder token={token} />
    ) : cash && inKitchen ? (
      <p className="rounded-full bg-[#1c1c1c] px-4 py-3.5 text-center text-sm font-medium text-white">
        ההזמנה אושרה. הקישור נשאר פתוח
      </p>
    ) : settled || inKitchen ? (
      <p className="rounded-full bg-[#1c1c1c] px-4 py-3.5 text-center text-sm font-medium text-white">
        שולם · ההזמנה במטבח
      </p>
    ) : order.payment_url ? (
      <a
        href={order.payment_url}
        className="flex min-h-12 items-center justify-center rounded-full bg-[#1c1c1c] text-sm font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
      >
        לחץ לתשלום
      </a>
    ) : null;

  const day = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(order.scheduled_at));

  return (
    <main className="flex min-h-dvh justify-center bg-[#f3efe8] pb-36 print:bg-white print:pb-0">
      <article className="w-full max-w-md bg-[#fbf9f6]">
        <header className="guest-hero px-6 pb-9 pt-10 text-center text-white">
          <div className="guest-hero-glow" aria-hidden="true" />
          <div className="guest-hero-grid" aria-hidden="true" />
          <div className="guest-hero-scan" aria-hidden="true" />
          <div className="relative z-[1]">
            <img src="/brand/duba-logo.png" alt="duba" className="mx-auto h-12 w-auto" />
            <p className="mx-auto mt-6 max-w-[15rem] text-[13px] font-medium leading-6 text-white/75">
              תודה שבחרתם בקייטרינג דובה דובאי
            </p>
            <h1 className="mt-4 text-[1.65rem] font-medium leading-tight">{order.customer_name}</h1>
            {inKitchen ? <p className="mt-3 text-sm font-medium text-white/70">ההזמנה אושרה</p> : null}
          </div>
        </header>

        <section className="px-6 py-6">
          <h2 className="pb-2 text-center text-sm font-medium text-[#8a8175]">פרטי ההזמנה</h2>
          <Fact label="תאריך" value={day} />
          <Fact label="שעה" value={formatClock(order.scheduled_at)} />
          {order.leaves_at ? <Fact label="יוצא בשעה" value={order.leaves_at} /> : null}
          {order.destination ? <Fact label="מלון / כתובת" value={order.destination} /> : null}
          {order.guest_count ? <Fact label="נפשות" value={String(order.guest_count)} /> : null}
          {order.guest_note ? <Fact label="פירוט" value={order.guest_note} /> : null}
          {order.phone ? <Fact label="טלפון" value={order.phone} ltr /> : null}
          {order.allergy && order.allergy !== "אין" ? <Fact label="אלרגיה" value={order.allergy} /> : null}
          {order.special_request ? <Fact label="הערות" value={order.special_request} /> : null}
        </section>

        <section className="border-t border-[#eee8df] px-6 py-7">
          <h2 className="text-center text-sm font-medium text-[#8a8175]">המנות</h2>
          <ul className="mt-4">
            {(order.items ?? []).map((item, index) => {
              const qty = Number(item.quantity);
              const price = Number(item.unit_price);
              return (
                <li key={`${item.name}-${index}`} className="flex items-center gap-3 border-b border-[#eee8df] py-3.5">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="size-14 rounded-xl object-cover" />
                  ) : (
                    <span className="size-14 rounded-xl bg-[#f3efe8]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium leading-5">{item.name}</span>
                    <span className="mt-1 block text-[13px] text-[#8a8175]">
                      <bdi dir="ltr">
                        {qty} × {money(price)}
                      </bdi>
                    </span>
                  </span>
                  <span className="text-sm font-medium tabular-nums">{money(lineTotal(item))}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex flex-col gap-2.5">
            <Sum label="מנות" value={money(food)} />
            {delivery > 0 ? <Sum label="משלוח" value={money(delivery)} /> : null}
            {deposit > 0 ? <Sum label="פלטה בפיקדון" value={money(deposit)} /> : null}
            {returned > 0 ? <Sum label="בחזרה" value={money(returned)} /> : null}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-[#1c1c1c] pt-4">
            <span className="text-sm font-medium">{cash ? "סה״כ" : "לתשלום"}</span>
            <span className="text-[1.75rem] font-medium leading-none tabular-nums">{money(amount)}</span>
          </div>
          {cash ? <p className="mt-3 text-center text-[13px] text-[#8a8175]">תשלום במזומן במסירה</p> : null}
        </section>

        <div className="flex justify-center px-6 pb-8 pt-3">
          <PrintSheet />
        </div>
      </article>
      {action ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-[#f3efe8] from-60% to-transparent px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 no-print">
          <div className="pointer-events-auto w-full max-w-md">{action}</div>
        </div>
      ) : null}
    </main>
  );
}

function Fact({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#eee8df] py-3.5">
      <span className="shrink-0 text-[13px] text-[#8a8175]">{label}</span>
      <span dir={ltr ? "ltr" : "auto"} className="min-w-0 text-end text-sm font-medium text-[#1c1c1c]">
        {value}
      </span>
    </div>
  );
}

function Sum({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-[#8a8175]">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
