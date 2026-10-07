"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { cartTotal, clearCart, useCart, useCartReady, type CartLine } from "@/lib/store/cart";
import { aed, dict, nameOf, optionLabel, type Dict, type Lang } from "@/lib/store/i18n";
import { availableDates, slots } from "@/lib/store/schedule";
import { MINIMUM } from "../cart/cart-view";
import { placeOrder } from "./actions";

const FEE = 48;

const field =
  "mt-1.5 block h-12 w-full rounded-xl border border-white/15 bg-[#0b0b0b] px-4 text-[16px] text-white placeholder:text-white/35 transition focus:border-white/70 focus:outline-none focus:ring-2 focus:ring-white/10";

export function CheckoutForm({ lang, closed }: { lang: Lang; closed: boolean }) {
  const t = dict(lang);
  const lines = useCart();
  const ready = useCartReady();
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const friday = lines.some((line) => line.friday);
  const special = lines.some((line) => line.special);
  const dates = useMemo(() => availableDates({ friday, special }), [friday, special]);
  const day = dates.includes(date) ? date : (dates[0] ?? "");
  const times = useMemo(() => (day ? slots(day) : []), [day]);
  const hour = times.includes(time) ? time : (times[0] ?? "");
  const subtotal = cartTotal(lines);
  const fee = fulfillment === "delivery" ? FEE : 0;
  const total = subtotal + fee;
  const locale = lang === "he" ? "he-IL" : "en-GB";
  const blocked = pending || closed || subtotal < MINIMUM || !day || !hour;

  if (!ready) return <div className="min-h-[50dvh]" />;

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-semibold">{t.emptyCart}</h1>
        <Link href="/shop/collections/all" className="mt-8 inline-flex rounded-xl bg-white px-10 py-3 font-semibold text-black">
          {t.continueShopping}
        </Link>
      </div>
    );
  }

  function submit(form: FormData) {
    setError("");
    const value = (key: string) => String(form.get(key) ?? "").trim();
    start(async () => {
      const result = await placeOrder({
        lang,
        name: value("name"),
        phone: value("phone"),
        email: value("email"),
        fulfillment,
        address: value("address"),
        allergy: value("allergy"),
        notes: value("notes"),
        date: day,
        time: hour,
        lines: lines.map((line) => ({
          handle: line.handle,
          variant: line.variant,
          choice: line.choice,
          quantity: line.quantity,
          picks: line.picks,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearCart();
      window.location.assign(result.url);
    });
  }

  function dayParts(value: string) {
    const [y, m, d] = value.split("-").map(Number);
    const stamp = new Date(Date.UTC(y, m - 1, d));
    const format = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(stamp);
    return { weekday: format({ weekday: "short" }), day: format({ day: "numeric" }), month: format({ month: "short" }) };
  }

  const pay = (
    <>
      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-[#ff8a80]/40 bg-[#b3261e]/25 px-4 py-3 text-sm font-medium">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={blocked}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-[17px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-black/50"
      >
        {pending ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            {t.placing}
          </>
        ) : (
          <>
            {t.pay}
            <span className="opacity-40">·</span>
            <bdi dir="ltr">{aed(total)}</bdi>
          </>
        )}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-white/50">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        {t.secure}
      </p>
    </>
  );

  return (
    <form action={submit}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold md:text-[40px]">{t.checkout}</h1>
        <Link href="/shop/cart" className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline">
          {t.backToCart}
        </Link>
      </div>

      {closed ? (
        <p className="mb-6 rounded-xl border border-[#ff8a80]/40 bg-[#b3261e]/25 px-4 py-3 text-sm font-semibold">{t.closedShabbat}</p>
      ) : null}

      <details className="group mb-6 rounded-2xl border border-white/10 bg-white/[0.03] lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold">
            {t.showSummary}
            <span className="transition group-open:rotate-180">▾</span>
          </span>
          <bdi dir="ltr" className="text-lg font-semibold">
            {aed(total)}
          </bdi>
        </summary>
        <div className="border-t border-white/10 px-5 pb-5">
          <Summary lines={lines} lang={lang} t={t} subtotal={subtotal} fee={fee} fulfillment={fulfillment} />
        </div>
      </details>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10">
        <div className="min-w-0 space-y-5">
          <Step number={1} title={t.method}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["delivery", "pickup"] as const).map((option) => {
                const active = fulfillment === option;
                return (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${active ? "border-white bg-white/[0.07]" : "border-white/15 hover:border-white/40"}`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      checked={active}
                      onChange={() => setFulfillment(option)}
                      className="sr-only"
                    />
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-white" : "border-white/40"}`}>
                      {active ? <span className="size-2.5 rounded-full bg-white" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{option === "delivery" ? t.delivery : t.pickup}</span>
                      <span className="mt-0.5 block text-sm text-white/60">{option === "delivery" ? t.deliveryDubai : t.pickupFree}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {fulfillment === "delivery" ? (
              <p className="mt-3 text-sm text-white/55">
                {t.abuDhabi}{" "}
                <a href="https://wa.me/971559060717" className="font-medium text-white underline underline-offset-4" target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </p>
            ) : null}
          </Step>

          <Step number={2} title={t.dayTime} note={friday ? t.fridayDates : fulfillment === "delivery" ? t.when : t.whenPickup}>
            <p className="text-sm text-white/60">{t.day}</p>
            <div className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dates.map((option) => {
                const parts = dayParts(option);
                const active = option === day;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDate(option)}
                    className={`flex w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-xl border py-2.5 transition ${active ? "border-white bg-white text-black" : "border-white/15 hover:border-white/40"}`}
                  >
                    <span className={`text-xs ${active ? "text-black/60" : "text-white/55"}`}>{parts.weekday}</span>
                    <span className="text-xl font-semibold leading-7">{parts.day}</span>
                    <span className={`text-xs ${active ? "text-black/60" : "text-white/55"}`}>{parts.month}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-5 text-sm text-white/60">{t.time}</p>
            <div className="mt-2 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pe-1 sm:grid-cols-6">
              {times.map((option) => {
                const active = option === hour;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTime(option)}
                    className={`h-10 rounded-lg border text-sm tabular-nums transition ${active ? "border-white bg-white font-semibold text-black" : "border-white/15 hover:border-white/40"}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </Step>

          <Step number={3} title={t.details}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.name}>
                <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} />
              </Field>
              <Field label={t.phone}>
                <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+971 5X XXX XXXX" dir="ltr" className={field} />
              </Field>
              <Field label={t.email}>
                <input name="email" type="email" autoComplete="email" maxLength={120} dir="ltr" className={field} />
              </Field>
              <Field label={t.allergy}>
                <input name="allergy" maxLength={200} className={field} />
              </Field>
              {fulfillment === "delivery" ? (
                <Field label={t.address} wide>
                  <input name="address" required minLength={5} maxLength={300} autoComplete="street-address" className={field} />
                </Field>
              ) : null}
              <Field label={t.notes} wide>
                <textarea name="notes" rows={3} maxLength={1000} className={`${field} h-auto py-3`} />
              </Field>
            </div>
          </Step>

          <div className="lg:hidden">{pay}</div>
        </div>

        <aside className="hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:sticky lg:top-28 lg:block">
          <h2 className="text-lg font-semibold">{t.summary}</h2>
          <Summary lines={lines} lang={lang} t={t} subtotal={subtotal} fee={fee} fulfillment={fulfillment} />
          {subtotal < MINIMUM ? <p className="mb-4 text-sm text-[#ffb4ab]">{t.minimum}</p> : null}
          {pay}
        </aside>
      </div>
    </form>
  );
}

function Step({ number, title, note, children }: { number: number; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-black">{number}</span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-7">{title}</h2>
          {note ? <p className="text-sm text-white/55">{note}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block text-sm text-white/70 ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function Summary({
  lines,
  lang,
  t,
  subtotal,
  fee,
  fulfillment,
}: {
  lines: CartLine[];
  lang: Lang;
  t: Dict;
  subtotal: number;
  fee: number;
  fulfillment: "delivery" | "pickup";
}) {
  return (
    <>
      <ul className="mt-2 max-h-[22rem] space-y-4 overflow-y-auto pe-3 pt-3">
        {lines.map((line) => (
          <li key={line.key} className="flex items-center gap-4">
            <span className="relative shrink-0">
              {line.image ? (
                <img src={line.image} alt="" className="size-16 rounded-xl border border-white/10 object-cover" />
              ) : (
                <span className="block size-16 rounded-xl bg-white/10" />
              )}
              <span className="absolute -top-2 end-[-0.5rem] grid min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-bold leading-6 text-black shadow">
                {line.quantity}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{nameOf(line, lang)}</span>
              {line.options.length > 0 ? (
                <span className="block truncate text-xs text-white/55">
                  {line.options.map((option) => optionLabel(option, lang)).join(" / ")}
                </span>
              ) : null}
              {line.picks?.length ? (
                <span className="block text-xs text-white/55">
                  {line.picks.reduce((sum, pick) => sum + pick.quantity, 0)} · {t.selection}
                </span>
              ) : null}
            </span>
            <bdi dir="ltr" className="shrink-0 text-sm tabular-nums">
              {aed(line.price * line.quantity)}
            </bdi>
          </li>
        ))}
      </ul>
      <div className="my-5 space-y-2.5 border-t border-white/10 pt-5 text-sm">
        <Row label={t.subtotal} value={aed(subtotal)} />
        <Row label={fulfillment === "delivery" ? t.delivery : t.pickup} value={fee ? aed(fee) : "—"} />
        <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
          <span className="text-base font-semibold">{t.total}</span>
          <bdi dir="ltr" className="text-2xl font-semibold tabular-nums">
            {aed(subtotal + fee)}
          </bdi>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-white/60">{label}</span>
      <bdi dir="ltr" className="tabular-nums">
        {value}
      </bdi>
    </div>
  );
}
