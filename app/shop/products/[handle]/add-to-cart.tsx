"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addLine } from "@/lib/store/cart";
import type { Product } from "@/lib/store/catalog";
import { aed, dict, optionLabel, type Lang } from "@/lib/store/i18n";

const drink = /coca|mirinda|sprite|water|soda/i;

export function AddToCart({
  item,
  lang,
  friday,
  special,
  closed,
}: {
  item: Product;
  lang: Lang;
  friday: boolean;
  special: boolean;
  closed: boolean;
}) {
  const t = dict(lang);
  const [chosen, setChosen] = useState<string[]>(() => item.variants[0]?.options ?? []);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = useMemo(
    () =>
      item.variants.find((candidate) => candidate.options.every((option, index) => option === chosen[index])) ??
      item.variants[0],
    [item.variants, chosen],
  );
  const options = item.options.filter((option) => option.values.length > 1);
  const available = Boolean(variant?.available) && !closed;

  function add() {
    if (!variant || !available) return;
    addLine({
      handle: item.handle,
      variant: variant.kept,
      choice: variant.options.filter((option) => drink.test(option)).join(" / "),
      options: variant.options.filter((option, index) => (item.options[index]?.values.length ?? 0) > 1 || drink.test(option)),
      title: item.title,
      he: item.he,
      image: item.images[0] ?? "",
      price: variant.price,
      quantity,
      friday,
      special,
    });
    setAdded(true);
  }

  return (
    <div>
      <p className="text-xl" dir="ltr">
        <bdi>{variant ? aed(variant.price) : ""}</bdi>
      </p>
      {options.map((option) => {
        const position = item.options.indexOf(option);
        return (
          <fieldset key={option.name} className="mt-6">
            <legend className="text-sm text-white/75">{optionLabel(option.name, lang)}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = chosen[position] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setChosen((current) => current.map((entry, index) => (index === position ? value : entry)));
                      setAdded(false);
                    }}
                    className={`rounded-full border px-5 py-2 text-[15px] transition ${active ? "border-white bg-white text-black" : "border-white/40 hover:border-white"}`}
                  >
                    {optionLabel(value, lang)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <div className="mt-6">
        <p className="text-sm text-white/75">{t.quantity}</p>
        <div className="mt-2 inline-flex items-center border border-white/40">
          <button type="button" className="size-12 text-xl" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="-">
            −
          </button>
          <span className="w-10 text-center tabular-nums">{quantity}</span>
          <button type="button" className="size-12 text-xl" onClick={() => setQuantity((value) => Math.min(50, value + 1))} aria-label="+">
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!available}
        className="mt-6 min-h-12 w-full max-w-md rounded-lg border border-white px-6 text-base font-semibold hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {!variant?.available ? t.soldOut : closed ? t.unavailable : t.addToCart}
      </button>
      {added ? (
        <p className="mt-3 flex max-w-md items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm">
          <span>✓ {t.added}</span>
          <Link href="/shop/cart" className="font-semibold underline">
            {t.viewCart}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
