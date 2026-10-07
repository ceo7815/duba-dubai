"use client";

import Link from "next/link";
import { cartTotal, setQuantity, useCart, useCartReady, type CartLine } from "@/lib/store/cart";
import { aed, dict, nameOf, optionLabel, type Lang } from "@/lib/store/i18n";

export const MINIMUM = 150;

export function LineSummary({ line, lang }: { line: CartLine; lang: Lang }) {
  const t = dict(lang);
  return (
    <>
      <p className="font-semibold leading-6">{nameOf(line, lang)}</p>
      {line.options.length > 0 ? (
        <p className="mt-0.5 text-sm text-white/65">{line.options.map((option) => optionLabel(option, lang)).join(" / ")}</p>
      ) : null}
      {line.picks?.length ? (
        <details className="mt-1 text-sm text-white/65">
          <summary className="cursor-pointer">{t.selection}</summary>
          <ul className="mt-1 space-y-0.5">
            {line.picks.map((pick) => (
              <li key={`${pick.group}-${pick.title}`}>
                {pick.quantity}× {nameOf(pick, lang)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

export function CartView({ lang, closed }: { lang: Lang; closed: boolean }) {
  const t = dict(lang);
  const lines = useCart();
  const ready = useCartReady();
  const total = cartTotal(lines);
  const short = total < MINIMUM;

  if (!ready) return <div className="min-h-[40dvh]" />;

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-semibold md:text-[40px]">{t.emptyCart}</h1>
        <Link href="/shop/collections/all" className="mt-8 inline-flex rounded-lg bg-white px-10 py-3 font-semibold text-black">
          {t.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold md:text-[40px]">{t.yourCart}</h1>
        <Link href="/shop/collections/all" className="text-sm underline">
          {t.continueShopping}
        </Link>
      </div>
      {closed ? <p className="mt-6 rounded-lg bg-[#b3261e]/80 px-4 py-3 text-sm font-semibold">{t.closedShabbat}</p> : null}
      <ul className="mt-6 divide-y divide-white/15 border-y border-white/15">
        {lines.map((line) => (
          <li key={line.key} className="flex gap-4 py-5">
            {line.image ? <img src={line.image} alt="" className="size-24 shrink-0 rounded-lg object-cover md:size-28" /> : null}
            <div className="min-w-0 flex-1">
              <LineSummary line={line} lang={lang} />
              <p className="mt-1 text-sm" dir="ltr">
                <bdi>{aed(line.price)}</bdi>
              </p>
              <div className="mt-3 flex items-center gap-4">
                {line.picks ? (
                  <span className="text-sm text-white/65">{t.quantity}: 1</span>
                ) : (
                  <div className="inline-flex items-center border border-white/40">
                    <button type="button" className="size-10 text-lg" onClick={() => setQuantity(line.key, line.quantity - 1)} aria-label="-">
                      −
                    </button>
                    <span className="w-8 text-center tabular-nums">{line.quantity}</span>
                    <button type="button" className="size-10 text-lg" onClick={() => setQuantity(line.key, line.quantity + 1)} aria-label="+">
                      +
                    </button>
                  </div>
                )}
                <button type="button" onClick={() => setQuantity(line.key, 0)} className="text-sm text-white/65 underline">
                  {t.remove}
                </button>
              </div>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums" dir="ltr">
              {aed(line.price * line.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-end gap-3">
        <p className="text-lg">
          {t.subtotal}: <bdi dir="ltr" className="font-semibold">{aed(total)}</bdi>
        </p>
        {short ? <p className="text-sm text-[#ffb4ab]">{t.minimum}</p> : null}
        {short || closed ? (
          <span className="flex min-h-12 w-full max-w-sm cursor-not-allowed items-center justify-center rounded-lg bg-white/30 font-semibold text-black/60">
            {t.checkout}
          </span>
        ) : (
          <Link href="/shop/checkout" className="flex min-h-12 w-full max-w-sm items-center justify-center rounded-lg bg-white font-semibold text-black hover:bg-white/90">
            {t.checkout}
          </Link>
        )}
      </div>
    </div>
  );
}
