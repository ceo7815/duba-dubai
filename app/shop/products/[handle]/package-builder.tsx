"use client";

import Link from "next/link";
import { useState } from "react";
import { addLine } from "@/lib/store/cart";
import type { MenuDish, PackageGroup } from "@/lib/store/catalog";
import { aed, dict, nameOf, type Lang } from "@/lib/store/i18n";

const groups: { id: PackageGroup; icon: string }[] = [
  { id: "salad", icon: "🥗" },
  { id: "starter", icon: "🍲" },
  { id: "main", icon: "🍖" },
];

export function PackageBuilder({
  handle,
  title,
  he,
  image,
  price,
  variant,
  limits,
  menu,
  lang,
}: {
  handle: string;
  title: string;
  he: string;
  image: string;
  price: number;
  variant: string;
  limits: Record<PackageGroup, number>;
  menu: MenuDish[];
  lang: Lang;
}) {
  const t = dict(lang);
  const [tab, setTab] = useState<PackageGroup>("salad");
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(menu.filter((dish) => dish.fixed).map((dish) => [dish.id, 1])),
  );
  const [notice, setNotice] = useState("");
  const [added, setAdded] = useState(false);

  const total = (group: PackageGroup) =>
    menu.filter((dish) => dish.group === group).reduce((sum, dish) => sum + (counts[dish.id] ?? 0), 0);
  const complete = groups.every((group) => total(group.id) === limits[group.id]);

  function change(dish: MenuDish, delta: number) {
    if (dish.fixed) return;
    const current = counts[dish.id] ?? 0;
    if (delta > 0 && total(dish.group) >= limits[dish.group]) {
      setNotice(t.limit(limits[dish.group]));
      return;
    }
    setNotice("");
    setAdded(false);
    setCounts({ ...counts, [dish.id]: Math.max(0, current + delta) });
  }

  function add() {
    if (!complete) return;
    addLine({
      handle,
      variant,
      choice: "",
      options: [],
      title,
      he,
      image,
      price,
      quantity: 1,
      friday: true,
      special: false,
      picks: menu
        .filter((dish) => (counts[dish.id] ?? 0) > 0)
        .map((dish) => ({ group: dish.group, title: dish.title, he: dish.he, quantity: counts[dish.id] })),
    });
    setCounts(Object.fromEntries(menu.filter((dish) => dish.fixed).map((dish) => [dish.id, 1])));
    setAdded(true);
  }

  const chosen = menu.filter((dish) => (counts[dish.id] ?? 0) > 0);

  return (
    <section className="mt-10 rounded-2xl bg-[#f7f3ec] p-4 text-[#1c2526] md:p-8">
      <div className="text-center">
        <p className="text-2xl font-bold md:text-3xl">{nameOf({ title, he }, lang)}</p>
        <p className="mt-1 text-sm text-[#5d5a55]">
          {groups.map((group) => `${t[group.id]} (${limits[group.id]})`).join(" | ")}
        </p>
        <p className="mt-2 text-xl font-semibold text-[#a77a0b]" dir="ltr">
          {aed(price)}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {groups.map((group) => {
          const count = total(group.id);
          const done = count === limits[group.id];
          return (
            <div key={group.id} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex justify-between text-sm font-semibold">
                <span>{t[group.id]}</span>
                <span className="tabular-nums" dir="ltr">
                  {count}/{limits[group.id]}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eee6d8]">
                <div
                  className={`h-full rounded-full transition-all ${done ? "bg-[#3d8b40]" : "bg-[#a77a0b]"}`}
                  style={{ width: `${Math.min(100, (count / limits[group.id]) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setTab(group.id)}
            className={`rounded-full border-2 px-5 py-2 font-semibold transition ${tab === group.id ? "border-[#a77a0b] bg-[#a77a0b] text-white" : "border-[#e2d9c9] bg-white"}`}
          >
            {group.icon} {t[group.id]}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {menu
          .filter((dish) => dish.group === tab)
          .map((dish) => {
            const count = counts[dish.id] ?? 0;
            return (
              <div
                key={dish.id}
                className={`flex flex-col items-center rounded-xl border-2 bg-white p-3 text-center transition ${count > 0 ? "border-[#a77a0b]" : "border-transparent"}`}
              >
                {dish.image ? <img src={dish.image} alt="" className="size-24 rounded-full object-cover md:size-28" /> : null}
                <p className="mt-2 min-h-10 text-sm font-semibold leading-5">{nameOf(dish, lang)}</p>
                {dish.fixed ? (
                  <span className="mt-2 rounded-full bg-[#3d8b40] px-3 py-1 text-xs font-semibold text-white">{t.included}</span>
                ) : (
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => change(dish, -1)}
                      className="size-9 rounded-full bg-[#eee6d8] text-lg font-bold"
                      aria-label="-"
                    >
                      −
                    </button>
                    <span className="w-5 font-semibold tabular-nums">{count}</span>
                    <button
                      type="button"
                      onClick={() => change(dish, 1)}
                      className="size-9 rounded-full bg-[#a77a0b] text-lg font-bold text-white"
                      aria-label="+"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
      {total(tab) < limits[tab] ? <p className="mt-4 text-center text-sm font-semibold text-[#b3261e]">❗ {t.complete}</p> : null}
      {notice ? <p className="mt-3 text-center text-sm font-semibold text-[#b3261e]">{notice}</p> : null}

      {chosen.length > 0 ? (
        <div className="mt-6 rounded-xl bg-white p-4">
          <p className="font-semibold">{t.selection}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {chosen.map((dish) => (
              <li key={dish.id} className="flex items-center gap-2 rounded-md bg-[#f7f3ec] px-3 py-2 text-sm">
                <span className="min-w-6 font-semibold text-[#a77a0b]">{counts[dish.id]}×</span>
                <span>{nameOf(dish, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={add}
        disabled={!complete}
        className="mx-auto mt-6 flex min-h-14 w-full max-w-md items-center justify-center rounded-full bg-[#a77a0b] text-lg font-semibold text-white shadow-lg transition hover:bg-[#8b6508] disabled:bg-[#cccccc] disabled:shadow-none"
      >
        🛒 {t.addToCart}
      </button>
      {added ? (
        <p className="mx-auto mt-3 flex max-w-md items-center justify-between rounded-lg bg-white px-4 py-3 text-sm">
          <span>✓ {t.added}</span>
          <Link href="/shop/cart" className="font-semibold underline">
            {t.viewCart}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
