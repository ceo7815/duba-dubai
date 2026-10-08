"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/domain";
import { slotTitles, slots, type PackageOption, type PackageRule, type Slot } from "@/lib/packages";
import { savePackageLimits, setDishShortage, setPackageOption } from "./actions";

export type Candidate = PackageOption & { category: string };

const slotCategories: Record<Slot, string[]> = {
  starter: ["עיקריות", "ראשונות"],
  main: ["עיקריות"],
  salad: ["סלטים"],
};

export function PackagesEditor({ packages, candidates }: { packages: PackageRule[]; candidates: Candidate[] }) {
  if (packages.length === 0) return null;
  return (
    <section className="mt-4 flex flex-col gap-3">
      <h2 className="text-lg font-extrabold">חבילות שישי</h2>
      <p className="text-sm leading-6 text-muted">
        כמה מכל סוג בחבילה, ואילו מנות אפשר לבחור. מתעדכן מיד בהזמנה חדשה ובחנות באתר.
      </p>
      {packages.map((rule) => (
        <PackageCard key={rule.id} rule={rule} candidates={candidates} />
      ))}
    </section>
  );
}

function PackageCard({ rule, candidates }: { rule: PackageRule; candidates: Candidate[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [need, setNeed] = useState(rule.need);
  const [slot, setSlot] = useState<Slot>("starter");
  const [error, setError] = useState("");
  const changed = slots.some((key) => need[key] !== rule.need[key]);

  function run(action: () => Promise<{ error?: string }>) {
    setError("");
    start(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  const chosen = new Set(rule.options[slot].map((option) => option.id));
  const pool = [
    ...rule.options[slot].map((option) => ({ ...option, category: "" })),
    ...candidates.filter((dish) => !chosen.has(dish.id) && slotCategories[slot].includes(dish.category)),
  ];

  return (
    <article className={`rounded-2xl border border-line bg-card p-4 ${pending ? "opacity-70" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-extrabold">{rule.name}</h3>
        <span className="text-sm font-bold text-muted">{money(rule.price)}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((key) => (
          <div key={key} className="flex flex-col items-center gap-1.5 rounded-xl bg-paper p-2">
            <span className="text-xs font-bold">{slotTitles[key]}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="grid size-8 place-items-center rounded-full border border-ink font-bold"
                aria-label={`פחות ${slotTitles[key]}`}
                onClick={() => setNeed((current) => ({ ...current, [key]: Math.max(0, current[key] - 1) }))}
              >
                −
              </button>
              <span className="w-6 text-center text-lg font-extrabold tabular-nums">{need[key]}</span>
              <button
                type="button"
                className="grid size-8 place-items-center rounded-full bg-ink font-bold text-white"
                aria-label={`יותר ${slotTitles[key]}`}
                onClick={() => setNeed((current) => ({ ...current, [key]: Math.min(40, current[key] + 1) }))}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      {changed ? (
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            disabled={pending}
            className="min-h-11 rounded-xl bg-ink text-sm font-extrabold text-white"
            onClick={() => run(() => savePackageLimits(rule.id, need))}
          >
            שמירת הכמויות
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold"
            onClick={() => setNeed(rule.need)}
          >
            ביטול
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-1.5" role="tablist">
        {slots.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={slot === key}
            onClick={() => setSlot(key)}
            className={`min-h-10 rounded-xl border text-sm font-extrabold ${
              slot === key ? "border-ink bg-ink text-white" : "border-line"
            }`}
          >
            {slotTitles[key]} · {rule.options[key].length}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {pool.map((dish) => {
          const inPackage = chosen.has(dish.id);
          return (
            <li
              key={dish.id}
              className={`flex items-center gap-3 rounded-2xl border p-2 ${inPackage ? "border-ink bg-white" : "border-line"}`}
            >
              {dish.image_url ? (
                <img src={dish.image_url} alt="" className="size-11 rounded-xl object-cover" />
              ) : (
                <span className="size-11 rounded-xl bg-paper" />
              )}
              <p className={`min-w-0 flex-1 text-sm font-bold ${inPackage ? "" : "text-muted"}`}>{dish.name}</p>
              {inPackage ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setDishShortage(dish.id, !dish.shortage))}
                  className={`min-h-9 rounded-xl px-2.5 text-xs font-extrabold ${
                    dish.shortage ? "bg-[#d64545] text-white" : "bg-[#e3f3e8] text-[#1b6a33]"
                  }`}
                >
                  {dish.shortage ? "חסר · להחזיר" : "יש"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                aria-pressed={inPackage}
                onClick={() => run(() => setPackageOption(rule.id, slot, dish.id, !inPackage))}
                className={`min-h-9 rounded-xl px-2.5 text-xs font-extrabold ${
                  inPackage ? "border border-line" : "bg-ink text-white"
                }`}
              >
                {inPackage ? "הסרה" : "+ לחבילה"}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-2 text-sm font-bold text-[#d64545]">{error}</p> : null}
    </article>
  );
}
