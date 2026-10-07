"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { removeOrder } from "@/app/orders/actions";
import { Train } from "@/app/orders/stage-switch";
import { fulfillmentLabels, isFulfillment, money } from "@/lib/domain";
import type { OrderRow, ShortItem } from "@/lib/orders";

export function DayCard({
  order,
  time,
  items,
  owner,
  late,
}: {
  order: OrderRow;
  time: string;
  items: ShortItem[];
  owner: boolean;
  late: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const balance = Number(order.amount) - Number(order.paid);
  const allergy = order.allergy && order.allergy !== "אין" ? order.allergy : "";
  const phone = order.phone_key.startsWith("0") ? `971${order.phone_key.slice(1)}` : order.phone_key;

  function run(task: () => Promise<{ error?: string }>) {
    setError("");
    start(async () => {
      const result = await task();
      if (result.error) setError(result.error);
    });
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-card ${late ? "border-[#d64545]" : "border-line"} ${
        pending ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <Link href={`/orders/${order.id}`} className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className="w-14 shrink-0 text-center">
          <p className="text-xl font-extrabold leading-none">{time}</p>
          {late ? <p className="mt-1 text-[11px] font-extrabold text-[#d64545]">באיחור</p> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-lg font-extrabold leading-tight">{order.customer_name || "ללא שם"}</p>
            {owner ? (
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                  balance > 0 ? "bg-[#fff1cc] text-[#7a4f00]" : "bg-[#e3f3e8] text-[#1b6a33]"
                }`}
              >
                {balance > 0 ? `${order.ending === "cash" ? "מזומן" : "כרטיס"} · ${money(balance)}` : "שולם"}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {[
              isFulfillment(order.fulfillment) ? fulfillmentLabels[order.fulfillment] : "",
              order.destination,
              order.guest_count ? `${order.guest_count} נפשות` : "",
              order.leaves_at ? `יוצא ${order.leaves_at}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {allergy ? (
            <p className="mt-1.5 inline-flex rounded-full bg-[#d64545] px-2.5 py-0.5 text-xs font-extrabold text-white">
              אלרגיה: {allergy}
            </p>
          ) : null}
        </div>
      </Link>

      {items.length > 0 ? (
        <ul className="mx-4 flex flex-col gap-0.5 border-t border-line py-2.5 text-[15px]">
          {items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className={`flex gap-2 ${item.name.startsWith("↳") ? "ps-6 text-sm text-muted" : ""}`}
            >
              <span className="w-6 shrink-0 font-extrabold">{item.quantity}</span>
              <span className="min-w-0">{item.name.replace(/^↳\s*/, "")}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {order.special_request || order.salad_note ? (
        <div className="mx-4 mb-3 rounded-xl bg-paper px-3 py-2 text-sm font-bold leading-6">
          {order.special_request ? <p>{order.special_request}</p> : null}
          {order.salad_note ? <p className="whitespace-pre-line">סלטים: {order.salad_note}</p> : null}
        </div>
      ) : null}

      <div className="px-3 pb-3">
        <Train id={order.id} status={order.status} balance={balance} owner={owner} />
      </div>

      {owner ? (
        confirming ? (
          <div className="flex gap-2 border-t border-line p-3">
            <button
              type="button"
              onClick={() => run(() => removeOrder(order.id))}
              className="min-h-11 flex-1 rounded-xl bg-[#d64545] text-sm font-extrabold text-white"
            >
              כן, למחוק
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="quick min-h-11 flex-1 rounded-xl">
              ביטול
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 border-t border-line p-3">
            {order.phone_key ? (
              <>
                <a href={`tel:${order.phone}`} aria-label="חיוג" className="icon-button">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                  </svg>
                </a>
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" aria-label="וואטסאפ" className="icon-button">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z" />
                  </svg>
                </a>
              </>
            ) : null}
            <Link href={`/orders/${order.id}/edit`} aria-label="עריכה" className="icon-button">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </Link>
            <button type="button" onClick={() => setConfirming(true)} aria-label="מחיקה" className="icon-button text-[#d64545]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        )
      ) : null}

      {error ? <p className="border-t border-line px-4 py-2 text-sm font-bold text-[#d64545]">{error}</p> : null}
    </article>
  );
}
