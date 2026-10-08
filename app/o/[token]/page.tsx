import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { summaryDescription } from "@/lib/og-summary";
import { createClient } from "@supabase/supabase-js";
import { ConfirmOrder, PayButton } from "@/app/o/confirm-order";
import { PrintSheet } from "@/app/o/print-sheet";
import { formatClock } from "@/lib/dates";
import { currencyOf, formatCurrency, formatRate } from "@/lib/currency";
import { money } from "@/lib/domain";
import { guestLang, guestText, isGuestLang } from "@/lib/guest-text";
import { foodTotal, lineTotal, type SheetItem } from "@/lib/sheet";
import { includedLabel, parsePick, slotEnglish } from "@/lib/packages";
import { catalog } from "@/lib/store/catalog";

type GuestItem = SheetItem & { image_url?: string; handle?: string; variant?: string };

export const metadata: Metadata = {
  title: "סיכום ההזמנה שלך · דובה",
  description: summaryDescription,
  openGraph: { title: "סיכום ההזמנה שלך · Duba Dubai", description: summaryDescription },
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
  currency?: string;
  currency_rate?: number;
  amount_foreign?: number | null;
  items: GuestItem[];
};

const includedEnglish: Record<string, string> = {
  אורז: "White rice",
  "תפו״א": "Oven-baked potatoes",
  "תפוחי אדמה": "Oven-baked potatoes",
  חלה: "Challah",
  חלות: "Challahs",
  "תירוש קטן לקידוש": "Small grape juice for Kiddush",
};

function pickName(name: string, en: boolean) {
  const pick = parsePick(name);
  if (!pick) return null;
  if (!en) return `${pick.label} · ${pick.name}`;
  const title = catalog.menu.find((dish) => dish.he === pick.name)?.title ?? includedEnglish[pick.name] ?? pick.name;
  const label = pick.slot ? slotEnglish[pick.slot] : pick.label === includedLabel ? "Included" : pick.label;
  return `${label} · ${title}`;
}

function englishName(item: GuestItem) {
  const title = item.handle ? catalog.products[item.handle]?.title : "";
  if (!title) return item.name;
  return item.variant ? `${title} · ${item.variant}` : title;
}

export default async function GuestOrderPage({ params, searchParams }: PageProps<"/o/[token]">) {
  const { token } = await params;
  const { lang: wanted } = await searchParams;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data } = await supabase.rpc("order_for_guest", { lookup: token });
  const order = data as GuestOrder | null;
  if (!order?.customer_name) notFound();

  const lang = isGuestLang(wanted) ? wanted : guestLang(order.phone);
  const t = guestText[lang];
  const en = lang === "en";

  const amount = Number(order.amount);
  const currency = order.currency ?? "AED";
  const foreign = currency !== "AED" && order.amount_foreign != null ? Number(order.amount_foreign) : null;
  const total = foreign !== null ? formatCurrency(foreign, currency) : money(amount);
  const paid = Number(order.paid);
  const delivery = Number(order.delivery_fee ?? 0);
  const deposit = Number(order.tray_deposit ?? 0);
  const returned = Number(order.tray_return ?? 0);
  const food = foodTotal(order.items ?? []);
  const settled = amount > 0 && paid >= amount;
  const cash = order.ending === "cash";
  const inKitchen = ["in_kitchen", "out", "feedback_sent", "paid_shopify"].includes(order.status);
  const payUrl = !cash && !settled ? order.payment_url : "";

  const action = !inKitchen ? (
    <ConfirmOrder token={token} text={t} payUrl={payUrl} total={total} />
  ) : (
    <div className="flex flex-col gap-2">
      <p className="rounded-full bg-[#1c1c1c] px-4 py-3.5 text-center text-sm font-medium text-white">
        {settled ? t.paidDone : cash ? t.cashDone : t.confirmed}
      </p>
      {payUrl ? <PayButton href={payUrl} text={t} total={total} /> : null}
    </div>
  );

  const day = new Intl.DateTimeFormat(en ? "en-GB" : "he-IL", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(order.scheduled_at));

  return (
    <main
      dir={en ? "ltr" : "rtl"}
      lang={lang}
      className="flex min-h-dvh justify-center bg-[#f3efe8] pb-40 print:bg-white print:pb-0"
    >
      <article className="w-full max-w-md bg-[#fbf9f6]">
        <header className="guest-hero relative px-6 pb-9 pt-10 text-center text-white">
          <div className="guest-hero-glow" aria-hidden="true" />
          <div className="guest-hero-grid" aria-hidden="true" />
          <div className="guest-hero-scan" aria-hidden="true" />
          <Link
            href={`/o/${token}?lang=${en ? "he" : "en"}`}
            replace
            className="absolute end-4 top-4 z-[2] rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white no-print"
          >
            {t.switchTo}
          </Link>
          <div className="relative z-[1]">
            <img src="/brand/duba-logo.png" alt="duba" className="mx-auto h-12 w-auto" />
            <p className="mx-auto mt-6 max-w-[16rem] text-[13px] font-medium leading-6 text-white/75">{t.thanks}</p>
            <h1 className="mt-4 text-[1.65rem] font-medium leading-tight">{order.customer_name}</h1>
            {inKitchen ? <p className="mt-3 text-sm font-medium text-white/70">{t.confirmed}</p> : null}
          </div>
        </header>

        <section className="px-6 py-6">
          <h2 className="pb-2 text-center text-sm font-medium text-[#8a8175]">{t.details}</h2>
          <Fact label={t.date} value={day} />
          <Fact label={t.time} value={formatClock(order.scheduled_at)} ltr />
          {order.leaves_at ? <Fact label={t.leaves} value={order.leaves_at} /> : null}
          {order.destination ? <Fact label={t.place} value={order.destination} /> : null}
          {order.guest_count ? <Fact label={t.guests} value={String(order.guest_count)} /> : null}
          {order.guest_note ? <Fact label={t.guestNote} value={order.guest_note} /> : null}
          {order.phone ? <Fact label={t.phone} value={order.phone} ltr /> : null}
          {order.allergy && order.allergy !== "אין" ? <Fact label={t.allergy} value={order.allergy} /> : null}
          {order.special_request ? <Fact label={t.notes} value={order.special_request} /> : null}
        </section>

        <section className="border-t border-[#eee8df] px-6 py-7">
          <h2 className="text-center text-sm font-medium text-[#8a8175]">{t.dishes}</h2>
          <ul className="mt-4">
            {(order.items ?? []).map((item, index) => {
              const qty = Number(item.quantity);
              const price = Number(item.unit_price);
              const pick = pickName(item.name, en);
              if (pick)
                return (
                  <li
                    key={`${item.name}-${index}`}
                    className="-mt-px flex items-baseline gap-2 border-b border-[#f3efe8] py-1.5 ps-[4.25rem] text-[13px] text-[#5f574d]"
                  >
                    <span className="tabular-nums" dir="ltr">
                      {qty}×
                    </span>
                    <span className="min-w-0 flex-1">{pick}</span>
                  </li>
                );
              return (
                <li key={`${item.name}-${index}`} className="flex items-center gap-3 border-b border-[#eee8df] py-3.5">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="size-14 rounded-xl object-cover" />
                  ) : (
                    <span className="size-14 rounded-xl bg-[#f3efe8]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium leading-5">{en ? englishName(item) : item.name}</span>
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
            <Sum label={t.food} value={money(food)} />
            {delivery > 0 ? <Sum label={t.delivery} value={money(delivery)} /> : null}
            {deposit > 0 ? <Sum label={t.deposit} value={money(deposit)} /> : null}
            {returned > 0 ? <Sum label={t.returned} value={money(returned)} /> : null}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-[#1c1c1c] pt-4">
            <span className="text-sm font-medium">{cash ? t.total : t.toPay}</span>
            <span className="text-[1.75rem] font-medium leading-none tabular-nums">{total}</span>
          </div>
          {foreign !== null ? (
            <p className="mt-2 text-end text-[12px] text-[#8a8175]">
              <bdi dir="ltr">
                1 {currencyOf(currency).symbol} = {formatRate(Number(order.currency_rate))} AED
              </bdi>{" "}
              · {t.rounded}
            </p>
          ) : null}
          {cash ? <p className="mt-3 text-center text-[13px] text-[#8a8175]">{t.cashNote}</p> : null}
        </section>

        <div className="flex justify-center px-6 pb-8 pt-3">
          <PrintSheet label={t.pdf} />
        </div>
      </article>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-[#f3efe8] from-60% to-transparent px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 no-print">
        <div className="pointer-events-auto w-full max-w-md">{action}</div>
      </div>
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
