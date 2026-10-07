"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { money } from "@/lib/domain";
import { collectionLabels } from "@/lib/store/i18n";
import { setPackageDish, setStock } from "./actions";
import type { AdminProduct, PackageDish } from "./data";
import { menuCollections } from "./types";

const NONE = "none";

function priceText(product: AdminProduct) {
  const prices = product.rows.map((row) => row.price);
  if (prices.length === 0) return "אין מחיר";
  const low = Math.min(...prices);
  return `${prices.some((price) => price !== low) ? "מ־" : ""}${money(low)}`;
}

export function MenuList({ products }: { products: AdminProduct[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const text = query.trim().toLowerCase();
  const shown = products.filter((product) => {
    if (group === NONE ? product.collections.length > 0 : group && !product.collections.includes(group)) return false;
    if (!text) return true;
    return product.title_he.toLowerCase().includes(text) || product.title_en.toLowerCase().includes(text);
  });
  const outCount = products.filter((product) => product.rows.length > 0 && product.rows.every((row) => row.shortage)).length;

  return (
    <section className="flex flex-col gap-3">
      <input
        className="field"
        type="search"
        placeholder="חיפוש מוצר"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Dropdown
        value={group}
        onChange={setGroup}
        options={[
          { value: "", label: "כל הקטגוריות", count: products.length },
          ...menuCollections.map((handle) => ({
            value: handle,
            label: collectionLabels[handle]?.he ?? handle,
            count: products.filter((product) => product.collections.includes(handle)).length,
          })),
          { value: NONE, label: "בתוך חבילות בלבד", count: products.filter((product) => product.collections.length === 0).length },
        ]}
      />
      <p className="text-sm text-muted">
        {shown.length} מוצרים{outCount > 0 ? ` · ${outCount} אזלו` : ""}
      </p>
      {shown.map((product) => (
        <ProductRow key={product.handle} product={product} />
      ))}
    </section>
  );
}

type DropdownOption = { value: string; label: string; count: number };

function Dropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="field flex items-center justify-between gap-2 text-start"
      >
        <span className="font-bold">
          {current.label} <span className="text-muted">({current.count})</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-5 shrink-0 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 max-h-[60dvh] overflow-y-auto rounded-2xl border border-line bg-card p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.16)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value || "all"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-[15px] font-bold ${
                    active ? "bg-ink text-white" : "hover:bg-paper"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-extrabold ${
                      active ? "bg-white/20 text-white" : "bg-paper text-muted"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ProductRow({ product }: { product: AdminProduct }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const out = product.rows.length > 0 && product.rows.every((row) => row.shortage);
  const partly = !out && product.rows.some((row) => row.shortage);

  return (
    <article
      className={`flex gap-3 rounded-2xl border border-line bg-card p-3 ${pending ? "opacity-60" : ""} ${
        product.active ? "" : "opacity-70"
      }`}
    >
      <Link href={`/menu/${product.handle}`} className="shrink-0">
        {product.images[0] ? (
          <img src={product.images[0]} alt="" className="size-[4.5rem] rounded-xl object-cover" />
        ) : (
          <span className="flex size-[4.5rem] items-center justify-center rounded-xl bg-paper text-xs text-muted">
            אין תמונה
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link href={`/menu/${product.handle}`} className="min-w-0">
          <h3 className="truncate text-base font-extrabold">{product.title_he}</h3>
          <p className="truncate text-xs text-muted" dir="ltr">
            {product.title_en}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-bold">
            {priceText(product)}
            {!product.active ? (
              <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-extrabold text-muted">מוסתר מהחנות</span>
            ) : null}
            {partly ? (
              <span className="rounded-full bg-[#fff1cc] px-2 py-0.5 text-xs font-extrabold text-[#7a4f00]">חלק אזל</span>
            ) : null}
          </p>
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || product.rows.length === 0}
            onClick={() =>
              start(async () => {
                setError("");
                const result = await setStock(product.handle, out);
                if (result.error) setError(result.error);
              })
            }
            className={`min-h-10 flex-1 rounded-xl text-sm font-extrabold ${
              out ? "bg-[#d64545] text-white" : "bg-[#e3f3e8] text-[#1b6a33]"
            }`}
          >
            {out ? "אזל · להחזיר" : "במלאי"}
          </button>
          <Link href={`/menu/${product.handle}`} className="quick flex-1">
            עריכה
          </Link>
        </div>
        {error ? <p className="text-sm font-bold text-[#d64545]">{error}</p> : null}
      </div>
    </article>
  );
}

const groupLabels: Record<string, string> = { salad: "סלטים", starter: "ראשונות", main: "עיקריות" };

export function PackageDishes({ dishes }: { dishes: PackageDish[] }) {
  return (
    <section className="mt-4 flex flex-col gap-3">
      <h2 className="text-lg font-extrabold">מנות לבחירה בחבילות שישי</h2>
      <p className="text-sm leading-6 text-muted">מנה כבויה לא מופיעה ללקוח בבחירת החבילה.</p>
      {["salad", "starter", "main"].map((grp) => (
        <div key={grp} className="flex flex-col gap-2">
          <p className="text-sm font-extrabold">{groupLabels[grp]}</p>
          {dishes
            .filter((dish) => dish.grp === grp)
            .map((dish) => (
              <PackageDishRow key={dish.id} dish={dish} />
            ))}
        </div>
      ))}
    </section>
  );
}

function PackageDishRow({ dish }: { dish: PackageDish }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-line bg-card p-2 ${pending ? "opacity-60" : ""}`}>
      {dish.image ? <img src={dish.image} alt="" className="size-11 rounded-full object-cover" /> : null}
      <p className="min-w-0 flex-1 truncate text-sm font-bold">{dish.title_he}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => void (await setPackageDish(dish.id, !dish.active)))}
        className={`min-h-9 rounded-xl px-3 text-xs font-extrabold ${
          dish.active ? "bg-[#e3f3e8] text-[#1b6a33]" : "bg-[#d64545] text-white"
        }`}
      >
        {dish.active ? "זמין" : "כבוי · להפעיל"}
      </button>
    </div>
  );
}
