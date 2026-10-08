"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/domain";
import {
  missingText,
  pickKey,
  slotCount,
  slotTitles,
  slots,
  type PackagePicks,
  type PackageRule,
  type Slot,
} from "@/lib/packages";

export type Pack = { key: string; packageId: string; picks: PackagePicks };

export function packProblem(rules: PackageRule[], packs: Pack[]) {
  for (const pack of packs) {
    const rule = rules.find((row) => row.id === pack.packageId);
    if (!rule) return { key: pack.key, text: "חבילה לא נמצאה" };
    const text = missingText(rule, pack.picks);
    if (text) return { key: pack.key, text: `${rule.name}: ${text}` };
  }
  return null;
}

export function PackageList({
  rules,
  packs,
  onEdit,
  onRemove,
}: {
  rules: PackageRule[];
  packs: Pack[];
  onEdit: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  if (packs.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {packs.map((pack) => {
        const rule = rules.find((row) => row.id === pack.packageId);
        if (!rule) return null;
        const problem = missingText(rule, pack.picks);
        const sameKind = packs.filter((row) => row.packageId === pack.packageId);
        const number = sameKind.length > 1 ? ` ${sameKind.indexOf(pack) + 1}` : "";
        return (
          <li
            key={pack.key}
            className={`rounded-2xl border bg-white p-3 ${problem ? "border-ink" : "border-line"}`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">
                  {rule.name}
                  {number}
                </p>
                <p className="mt-0.5 text-sm text-muted">{money(rule.price)}</p>
              </div>
              <button
                type="button"
                className="text-sm font-bold"
                aria-label={`מחיקת ${rule.name}${number}`}
                onClick={() => onRemove(pack.key)}
              >
                מחיקה
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {slots.map((slot) => {
                if (rule.need[slot] === 0) return null;
                const chosen = rule.options[slot].filter((option) => pack.picks[pickKey(slot, option.id)]);
                return (
                  <p key={slot} className="text-[13px] leading-5">
                    <span className="font-extrabold">
                      {slotTitles[slot]} {slotCount(pack.picks, slot)}/{rule.need[slot]}:
                    </span>{" "}
                    {chosen.length
                      ? chosen
                          .map((option) => {
                            const count = pack.picks[pickKey(slot, option.id)];
                            return count > 1 ? `${option.name} ×${count}` : option.name;
                          })
                          .join(" · ")
                      : <span className="text-muted">עוד לא נבחר</span>}
                  </p>
                );
              })}
            </div>
            {problem ? <p className="mt-2 text-sm font-extrabold">{problem}</p> : null}
            <button
              type="button"
              onClick={() => onEdit(pack.key)}
              className={`mt-3 min-h-11 w-full rounded-xl text-sm font-extrabold ${
                problem ? "bg-ink text-white" : "border border-line"
              }`}
            >
              {problem ? "השלמת הבחירה" : "שינוי הבחירה"}
            </button>
            <input
              type="hidden"
              name="pack"
              value={JSON.stringify({
                package_id: pack.packageId,
                picks: Object.entries(pack.picks)
                  .filter(([, count]) => count > 0)
                  .map(([key, quantity]) => {
                    const [slot, dish_id] = key.split(":");
                    return { slot, dish_id, quantity };
                  }),
              })}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function PackageSheet({
  rule,
  picks,
  onChange,
  onExtra,
  onClose,
}: {
  rule: PackageRule;
  picks: PackagePicks;
  onChange: (next: PackagePicks) => void;
  onExtra: (dishId: string) => void;
  onClose: () => void;
}) {
  const [offer, setOffer] = useState<{ slot: Slot; id: string } | null>(null);
  const [added, setAdded] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function change(slot: Slot, id: string, delta: number) {
    const key = pickKey(slot, id);
    const current = picks[key] ?? 0;
    if (delta > 0 && slotCount(picks, slot) >= rule.need[slot]) {
      setOffer({ slot, id });
      return;
    }
    setOffer(null);
    const next = { ...picks, [key]: Math.max(0, current + delta) };
    if (next[key] === 0) delete next[key];
    onChange(next);
  }

  const problem = missingText(rule, picks);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-title"
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl bg-card sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-line px-5 pb-3 pt-5">
          <h2 id="package-title" className="text-lg font-extrabold">
            {rule.name}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {slots
              .filter((slot) => rule.need[slot] > 0)
              .map((slot) => `${rule.need[slot]} ${slotTitles[slot]}`)
              .join(" · ")}{" "}
            · {money(rule.price)}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          {slots.map((slot) => {
            if (rule.need[slot] === 0) return null;
            const count = slotCount(picks, slot);
            const full = count >= rule.need[slot];
            return (
              <section key={slot} className="py-2">
                <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-card px-5 py-2">
                  <h3 className="text-base font-extrabold">{slotTitles[slot]}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-sm font-extrabold ${
                      count === rule.need[slot] ? "bg-ink text-white" : "bg-paper"
                    }`}
                  >
                    {count}/{rule.need[slot]}
                    {count === rule.need[slot] ? " ✓" : ""}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {rule.options[slot].map((option) => {
                    const chosen = picks[pickKey(slot, option.id)] ?? 0;
                    const blocked = option.shortage && chosen === 0;
                    const asking = offer?.slot === slot && offer.id === option.id;
                    return (
                      <li key={option.id} className={`rounded-2xl border p-2 ${chosen ? "border-ink" : "border-line"}`}>
                        <div className="flex items-center gap-3">
                          {option.image_url ? (
                            <img src={option.image_url} alt="" className="size-12 rounded-xl object-cover" />
                          ) : (
                            <span className="size-12 rounded-xl bg-paper" />
                          )}
                          <p className={`min-w-0 flex-1 text-sm font-extrabold ${blocked ? "text-muted" : ""}`}>
                            {option.name}
                            {option.shortage ? <span className="block text-xs font-bold text-muted">חסר השבוע</span> : null}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {chosen > 0 ? (
                              <>
                                <button
                                  type="button"
                                  className="grid size-10 place-items-center rounded-full border border-ink text-lg font-bold"
                                  aria-label={`הפחתת ${option.name}`}
                                  onClick={() => change(slot, option.id, -1)}
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-base font-extrabold">{chosen}</span>
                              </>
                            ) : null}
                            <button
                              type="button"
                              disabled={blocked}
                              className={`grid size-10 place-items-center rounded-full text-lg font-bold ${
                                full && !blocked ? "border border-line text-muted" : "bg-ink text-white"
                              } disabled:opacity-30`}
                              aria-label={`הוספת ${option.name}`}
                              onClick={() => change(slot, option.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {asking ? (
                          <div className="mt-2 rounded-xl bg-paper p-3 text-sm">
                            <p className="font-bold">
                              {slotTitles[slot]} בחבילה מלאים ({rule.need[slot]}). להוסיף {option.name} בתשלום?
                            </p>
                            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                              <button
                                type="button"
                                className="min-h-11 rounded-xl bg-ink text-sm font-extrabold text-white"
                                onClick={() => {
                                  onExtra(option.id);
                                  setOffer(null);
                                  setAdded(`${option.name} נוסף כמנה בתשלום · ${money(option.price)}`);
                                }}
                              >
                                הוספה בתשלום · {money(option.price)}
                              </button>
                              <button
                                type="button"
                                className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold"
                                onClick={() => setOffer(null)}
                              >
                                לא
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <div className="border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          {added ? <p className="mb-2 text-sm font-bold">{added} ✓</p> : null}
          <p className="mb-2 text-sm font-extrabold">{problem || "החבילה מלאה ✓"}</p>
          <button type="button" onClick={onClose} className="button w-full">
            {problem ? "סגירה, אשלים אחר כך" : "סיום"}
          </button>
        </div>
      </div>
    </div>
  );
}
