import type { ReactNode } from "react";
import Link from "next/link";
import { PrintNow } from "@/app/orders/[id]/print/print-now";
import { formatClock } from "@/lib/dates";
import {
  fulfillmentLabels,
  isFulfillment,
  isOrderKind,
  money,
  orderKindLabels,
} from "@/lib/domain";
import type { OrderItem, OrderRow } from "@/lib/orders";
import { orderMoney } from "@/lib/currency";
import { parsePick } from "@/lib/packages";

export function PrintFrame({
  back,
  children,
}: {
  back: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <main className="order-print min-h-dvh bg-[#e9e6e1] py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .order-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between gap-3 px-4">
        <Link href={back.href} className="text-sm font-bold underline">
          {back.label}
        </Link>
        <PrintNow />
      </div>
      <div className="flex flex-col gap-6 print:gap-0">{children}</div>
    </main>
  );
}

export function OrderSheet({
  order,
  items,
  showMoney,
}: {
  order: OrderRow;
  items: OrderItem[];
  showMoney: boolean;
}) {
  return (
    <PrintFrame back={{ href: `/orders/${order.id}`, label: "חזרה להזמנה" }}>
      <OrderPage order={order} items={items} showMoney={showMoney} />
    </PrintFrame>
  );
}

export function OrderPage({
  order,
  items,
  showMoney,
}: {
  order: OrderRow;
  items: OrderItem[];
  showMoney: boolean;
}) {
  const amount = Number(order.amount);
  const balance = Math.max(0, amount - Number(order.paid));
  const deposit = Number(order.tray_deposit ?? 0);
  const cash = order.ending === "cash";
  const pieces = items.reduce(
    (sum, item, index) => (items[index + 1] && parsePick(items[index + 1].name) ? sum : sum + Number(item.quantity)),
    0,
  );
  const number = order.id.slice(0, 6).toUpperCase();
  const day = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(order.scheduled_at));
  const kind = isOrderKind(order.order_kind)
    ? orderKindLabels[order.order_kind]
    : "";
  const fulfillment = isFulfillment(order.fulfillment)
    ? fulfillmentLabels[order.fulfillment]
    : "";
  const allergic = Boolean(order.allergy) && order.allergy !== "אין";
  const people = [
    order.guest_count ? `${order.guest_count} נפשות` : "",
    order.guest_note,
  ]
    .filter(Boolean)
    .join(" · ");

  const payment =
    balance <= 0 && amount > 0
      ? { label: "שולם", value: "✓", strong: false }
      : cash
        ? {
            label: "לגבייה במזומן במסירה",
            value: showMoney ? orderMoney(order, balance, false) : "מזומן",
            strong: true,
          }
        : {
            label: "ממתין לתשלום באשראי",
            value: showMoney ? orderMoney(order, balance, false) : "",
            strong: false,
          };

  return (
    <article className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] break-after-page flex-col bg-white text-[#111111] shadow-[0_10px_40px_rgba(0,0,0,0.12)] last:break-after-auto print:min-h-[296mm] print:shadow-none">
      <div className="flex items-center justify-between bg-[#0b0b0b] px-[14mm] py-[5mm] text-white">
        <img
          src="/brand/duba-logo.png"
          alt="duba"
          className="h-[12mm] w-auto"
        />
        <div className="text-end">
          <p className="text-[9pt] font-medium tracking-wide text-white/60">
            קייטרינג כשר · דובאי
          </p>
          <p className="mt-1 text-[15pt] font-extrabold">
            הזמנה <bdi dir="ltr">#{number}</bdi>
          </p>
        </div>
      </div>

      <section className="px-[14mm] pt-[6mm]">
        <div className="flex items-end justify-between gap-6 border-b-[2.5px] border-[#111111] pb-[4mm]">
          <div className="min-w-0">
            <p className="text-[10pt] font-bold text-[#7a7268]">
              {[order.is_quote ? "הצעת מחיר" : "", kind]
                .filter(Boolean)
                .join(" · ") || "הזמנה"}
            </p>
            <h1 className="mt-1 text-[26pt] font-extrabold leading-[1.05]">
              {order.customer_name}
            </h1>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-[11pt] font-bold">{day}</p>
            <p className="text-[26pt] font-extrabold leading-[1.05] tabular-nums">
              <bdi dir="ltr">{formatClock(order.scheduled_at)}</bdi>
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-4">
          <Fact wide label="מלון / כתובת" value={order.destination || "—"} />
          <Fact label="אספקה" value={fulfillment || "—"} />
          <Fact label="יוצא בשעה" value={order.leaves_at || "—"} />
          <Fact wide label="נפשות" value={people || "—"} />
          <Fact wide label="טלפון" value={order.phone || "—"} ltr />
        </dl>

        <div className="mt-[4mm] grid grid-cols-[1fr_2fr] gap-[4mm]">
          <div
            className={`rounded-[3mm] px-[5mm] py-[3mm] ${
              allergic
                ? "bg-[#111111] text-white"
                : "border-[1.5px] border-[#111111]"
            }`}
          >
            <p
              className={`text-[9pt] font-bold ${allergic ? "text-white/70" : "text-[#7a7268]"}`}
            >
              אלרגיה
            </p>
            <p className="mt-1 text-[16pt] font-extrabold leading-tight">
              {order.allergy || "אין"}
            </p>
          </div>
          <div className="rounded-[3mm] border-[1.5px] border-[#d9d4cc] px-[5mm] py-[3mm]">
            <p className="text-[9pt] font-bold text-[#7a7268]">הערות</p>
            <p className="mt-1 whitespace-pre-line text-[13pt] font-bold leading-snug">
              {order.special_request || "אין הערות"}
            </p>
          </div>
        </div>
      </section>

      <section className="flex-1 px-[14mm] pt-[5mm]">
        <div className="flex items-baseline justify-between border-b-[2.5px] border-[#111111] pb-[2mm]">
          <h2 className="text-[13pt] font-extrabold">המנות</h2>
          <p className="text-[10pt] font-bold text-[#7a7268]">
            {pieces} פריטים
          </p>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {items.map((item, index) => {
              const pick = parsePick(item.name);
              const parent = !pick && items[index + 1] && parsePick(items[index + 1].name);
              return (
              <tr
                key={item.id}
                className={`break-inside-avoid border-b border-[#e4dfd7] ${parent ? "bg-[#f1eee9]" : ""}`}
              >
                <td className="w-[9mm] py-[1.6mm] align-middle">
                  {parent ? null : (
                    <span className="block size-[5mm] rounded-[1.2mm] border-[1.5px] border-[#111111]" />
                  )}
                </td>
                <td className="w-[15mm] py-[1.6mm] align-middle">
                  <span className="flex h-[8mm] w-[11mm] items-center justify-center rounded-[2mm] bg-[#f1eee9] text-[14pt] font-extrabold tabular-nums">
                    {item.quantity}
                  </span>
                </td>
                <td className="py-[1.6mm] align-middle text-[12.5pt] font-bold leading-snug">
                  {pick ? (
                    <span className="ps-[4mm]">
                      <span className="text-[10pt] text-[#7a7268]">{pick.label} · </span>
                      {pick.name}
                    </span>
                  ) : (
                    <span className={parent ? "font-extrabold" : ""}>{item.name}</span>
                  )}
                </td>
                <td className="w-[12mm] py-[1.6mm] align-middle">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="ms-auto size-[9mm] rounded-[2mm] object-cover"
                    />
                  ) : null}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 ? (
          <p className="py-[5mm] text-[12pt] text-[#7a7268]">בלי מנות</p>
        ) : null}
      </section>

      <section className="break-inside-avoid px-[14mm] pb-[5mm] pt-[5mm]">
        <div className="grid grid-cols-[2fr_1fr] gap-[4mm]">
          <div
            className={`flex items-center justify-between rounded-[3mm] px-[5mm] py-[4mm] ${
              payment.strong
                ? "bg-[#111111] text-white"
                : "border-[1.5px] border-[#111111]"
            }`}
          >
            <p className="text-[12pt] font-extrabold">{payment.label}</p>
            {payment.value ? (
              <p className="text-[18pt] font-extrabold tabular-nums">
                {payment.value}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col justify-center rounded-[3mm] border-[1.5px] border-[#d9d4cc] px-[5mm] py-[3mm]">
            <p className="text-[9pt] font-bold text-[#7a7268]">פלטה בפיקדון</p>
            <p className="text-[12pt] font-extrabold">
              {deposit > 0
                ? showMoney
                  ? `${money(deposit)} · להחזיר`
                  : "להחזיר"
                : "אין"}
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-between border-t border-[#e4dfd7] px-[14mm] py-[5mm] text-[9pt] text-[#7a7268]">
        <p className="font-bold text-[#111111]">
          תודה שבחרתם בקייטרינג דובה דובאי · בתיאבון
        </p>
        <p dir="ltr" className="font-medium">
          dubakosher.com · WhatsApp +971 55 906 0717
        </p>
      </footer>
    </article>
  );
}

function Fact({
  label,
  value,
  wide = false,
  ltr = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
  ltr?: boolean;
}) {
  return (
    <div
      className={`border-b border-[#d9d4cc] py-[2.4mm] pe-[3mm] ${wide ? "col-span-2" : ""}`}
    >
      <dt className="text-[9pt] font-bold text-[#7a7268]">{label}</dt>
      <dd
        dir={ltr ? "ltr" : "auto"}
        className={`mt-[1mm] text-[13pt] font-extrabold leading-snug ${ltr ? "text-end" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
