"use client";

import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/domain";
import { menuGroups, type MenuDish } from "@/lib/catalog";

function QtyField({
  name,
  count,
  onChange,
}: {
  name: string;
  count: number;
  onChange: (next: number) => void;
}) {
  const [text, setText] = useState(String(count));
  useEffect(() => setText(String(count)), [count]);

  function commit(raw: string) {
    const next = Number(raw);
    if (!raw || !Number.isInteger(next) || next < 1) {
      setText(String(count));
      return;
    }
    onChange(next);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full border border-[#111111] text-lg font-bold"
        aria-label={`הפחתת ${name}`}
        onClick={() => onChange(count - 1)}
      >
        −
      </button>
      <input
        value={text}
        inputMode="numeric"
        dir="ltr"
        aria-label={`כמות ${name}`}
        className="field field-en w-16 px-0 text-center text-base font-extrabold"
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, "").slice(0, 3);
          setText(raw);
          if (raw !== "" && Number(raw) > 0) onChange(Number(raw));
        }}
        onBlur={() => commit(text)}
      />
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full bg-[#111111] text-lg font-bold text-white"
        aria-label={`הוספת ${name}`}
        onClick={() => onChange(count + 1)}
      >
        +
      </button>
    </div>
  );
}

export function MenuPicker({
  dishes,
  qty,
  onChange,
}: {
  dishes: MenuDish[];
  qty: Record<string, number>;
  onChange: (id: string, next: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const needle = query.trim();
  const visible = useMemo(
    () => (needle ? dishes.filter((dish) => dish.name.includes(needle)) : dishes),
    [dishes, needle],
  );
  const picked = dishes.filter((dish) => (qty[dish.id] ?? 0) > 0);
  const pickedTotal = picked.reduce((sum, dish) => sum + (qty[dish.id] ?? 0) * Number(dish.price), 0);
  const known = new Set<string>(menuGroups);
  const extra = visible.filter((dish) => !known.has(dish.category));

  return (
    <div className="flex flex-col gap-4">
      {picked.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {picked.map((dish) => {
              const count = qty[dish.id] ?? 0;
              const price = Number(dish.price);
              return (
                <li key={dish.id} className="rounded-2xl border border-line bg-white p-3">
                  <div className="flex items-start gap-3">
                    <img src={dish.image_url} alt="" className="size-16 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold">{dish.name}</p>
                      <p className="mt-1 text-sm text-muted">{money(price)}</p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-bold"
                      aria-label={`מחיקת ${dish.name}`}
                      onClick={() => onChange(dish.id, 0)}
                    >
                      מחיקה
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <QtyField name={dish.name} count={count} onChange={(next) => onChange(dish.id, next)} />
                    <p className="text-base font-extrabold">{money(count * price)}</p>
                  </div>
                  <input type="hidden" name="item_dish_id" value={dish.id} />
                  <input type="hidden" name="item_quantity" value={count} />
                </li>
              );
            })}
          </ul>
          <p className="flex items-baseline justify-between px-1 text-sm font-extrabold">
            <span>סה״כ מנות</span>
            <span>{money(pickedTotal)}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">בוחרים מנה מהתפריט, ואז מזינים כמות.</p>
      )}
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חיפוש מנה"
        className="field"
      />
      {[...menuGroups, ...(extra.length ? ["נוספות"] : [])].map((group) => {
        const rows = group === "נוספות" ? extra : visible.filter((dish) => dish.category === group);
        if (rows.length === 0) return null;
        const expanded = needle.length > 0 || Boolean(open[group]);
        const chosen = rows.reduce((sum, dish) => sum + ((qty[dish.id] ?? 0) > 0 ? 1 : 0), 0);
        return (
          <section key={group} className="overflow-hidden rounded-2xl border border-line bg-card">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-start"
              aria-expanded={expanded}
              onClick={() => setOpen((current) => ({ ...current, [group]: !current[group] }))}
            >
              <span className="min-w-0 flex-1 text-base font-extrabold">{group}</span>
              {chosen > 0 ? (
                <span className="rounded-full bg-[#111111] px-2 py-0.5 text-xs font-bold text-white">{chosen}</span>
              ) : null}
              <span className="text-sm text-muted">{rows.length}</span>
              <span className={`text-lg leading-none ${expanded ? "rotate-180" : ""}`} aria-hidden>
                ⌄
              </span>
            </button>
            {expanded ? (
            <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
            {rows.map((dish) => {
              const count = qty[dish.id] ?? 0;
              return (
                <div key={dish.id} className="flex items-center gap-3">
                  <img src={dish.image_url} alt="" className="size-16 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">{dish.name}</p>
                    <p className="text-sm text-muted">
                      {money(Number(dish.price))}
                      {dish.shortage ? " · חסר" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 ? <span className="w-6 text-center text-base font-extrabold">{count}</span> : null}
                    <button
                      type="button"
                      className="grid size-11 place-items-center rounded-full bg-[#111111] text-lg font-bold text-white"
                      aria-label={`הוספת ${dish.name}`}
                      onClick={() => onChange(dish.id, count + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
