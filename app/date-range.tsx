"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { addDays, dubaiKey } from "@/lib/dates";

type Range = { from: string; to: string };

const weekdays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const monthName = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("he-IL", { weekday: "short", timeZone: "UTC" });

const asDate = (key: string) => new Date(`${key}T00:00:00Z`);
const short = (key: string) => `${Number(key.slice(8))}.${Number(key.slice(5, 7))}`;
const withDay = (key: string) => `${dayName.format(asDate(key)).replace(/^יום\s+/, "")} ${short(key)}`;

function monthDays(month: string) {
  const first = asDate(`${month}-01`);
  const lead = first.getUTCDay();
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: lead }, () => ""),
    ...Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
  ];
}

function shiftMonth(month: string, step: number) {
  const date = asDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + step);
  return date.toISOString().slice(0, 7);
}

export function rangeLabel({ from, to }: Range, empty = "כל התאריכים") {
  if (!from && !to) return empty;
  if (from && to && from === to) return withDay(from);
  if (from && to && from.endsWith("-01") && to === addDays(`${shiftMonth(from.slice(0, 7), 1)}-01`, -1))
    return monthName.format(asDate(from));
  if (from && to) return `${withDay(from)} – ${withDay(to)}`;
  return from ? `מ-${withDay(from)}` : `עד ${withDay(to)}`;
}

export function DateRange({
  from,
  to,
  onChange,
  names,
  empty,
  label = "תאריכים",
}: {
  from: string;
  to: string;
  onChange?: (range: Range) => void;
  names?: { from: string; to: string };
  empty?: string;
  label?: string;
}) {
  const [value, setValue] = useState<Range>({ from, to });
  const [draft, setDraft] = useState<Range>({ from, to });
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((from || dubaiKey()).slice(0, 7));
  const root = useRef<HTMLDivElement>(null);
  const today = dubaiKey();

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = onChange ? { from, to } : value;

  function show() {
    setDraft(shown);
    setMonth((shown.from || today).slice(0, 7));
    setOpen(true);
  }

  function tap(day: string) {
    setDraft((current) => {
      if (!current.from || current.to) return { from: day, to: "" };
      if (day < current.from) return { from: day, to: current.from };
      return { from: current.from, to: day };
    });
  }

  function apply(next: Range) {
    const range = next.from && !next.to ? { from: next.from, to: next.from } : next;
    setOpen(false);
    if (onChange) {
      onChange(range);
      return;
    }
    flushSync(() => setValue(range));
    root.current?.closest("form")?.requestSubmit();
  }

  const presets: { label: string; range: Range }[] = [
    { label: "היום", range: { from: today, to: today } },
    { label: "מחר", range: { from: addDays(today, 1), to: addDays(today, 1) } },
    { label: "7 ימים", range: { from: today, to: addDays(today, 6) } },
    {
      label: "החודש",
      range: { from: `${today.slice(0, 7)}-01`, to: addDays(`${shiftMonth(today.slice(0, 7), 1)}-01`, -1) },
    },
  ];

  const set = Boolean(shown.from || shown.to);

  return (
    <div ref={root}>
      {names ? (
        <>
          <input type="hidden" name={names.from} value={value.from} />
          <input type="hidden" name={names.to} value={value.to} />
        </>
      ) : null}
      <button
        type="button"
        onClick={show}
        aria-label={`${label}: ${rangeLabel(shown, empty)}`}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 text-start"
      >
        <CalendarIcon />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold text-muted">{label}</span>
          <span className={`block truncate text-[15px] font-extrabold ${set ? "" : "text-muted"}`}>
            {rangeLabel(shown, empty)}
          </span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-50" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="בחירת תאריכים"
            className="mx-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-t-3xl bg-card px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" aria-hidden />

            <div className="grid grid-cols-2 gap-2">
              <Edge title="מתאריך" value={draft.from} active={!draft.from || !draft.to} />
              <Edge title="עד תאריך" value={draft.to} active={Boolean(draft.from && !draft.to)} />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {presets.map((preset) => {
                const on = draft.from === preset.range.from && draft.to === preset.range.to;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDraft(preset.range)}
                    className={`min-h-10 rounded-full border text-[13px] font-extrabold ${
                      on ? "border-ink bg-ink text-white" : "border-line bg-paper"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(month, -1))}
                aria-label="חודש קודם"
                className="flex size-10 items-center justify-center rounded-full border border-line text-lg font-extrabold"
              >
                ›
              </button>
              <p className="text-base font-extrabold">{monthName.format(asDate(`${month}-01`))}</p>
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(month, 1))}
                aria-label="חודש הבא"
                className="flex size-10 items-center justify-center rounded-full border border-line text-lg font-extrabold"
              >
                ‹
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-muted">
              {weekdays.map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {monthDays(month).map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />;
                const end = draft.to || draft.from;
                const edge = day === draft.from || day === end;
                const inside = Boolean(draft.from && end && day > draft.from && day < end);
                const first = day === draft.from && end && end !== draft.from;
                const last = day === end && draft.from && end !== draft.from;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => tap(day)}
                    className={`relative flex h-11 items-center justify-center text-[15px] font-bold ${
                      inside ? "bg-paper" : ""
                    } ${first ? "rounded-s-full bg-paper" : ""} ${last ? "rounded-e-full bg-paper" : ""}`}
                  >
                    <span
                      className={`flex size-10 items-center justify-center rounded-full ${
                        edge ? "bg-ink text-white" : day === today ? "ring-2 ring-ink ring-inset" : ""
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={() => apply({ from: "", to: "" })}
                className="min-h-12 rounded-2xl border border-line px-5 text-sm font-extrabold"
              >
                ניקוי
              </button>
              <button
                type="button"
                disabled={!draft.from}
                onClick={() => apply(draft)}
                className="min-h-12 rounded-2xl bg-ink text-[15px] font-extrabold text-white disabled:opacity-40"
              >
                {draft.from ? `הצגה · ${rangeLabel(draft.to ? draft : { from: draft.from, to: draft.from })}` : "בחרו תאריך"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Edge({ title, value, active }: { title: string; value: string; active: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${active ? "border-ink" : "border-line"}`}>
      <p className="text-[11px] font-bold text-muted">{title}</p>
      <p className={`text-[15px] font-extrabold ${value ? "" : "text-muted"}`}>{value ? withDay(value) : "בחירה"}</p>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
