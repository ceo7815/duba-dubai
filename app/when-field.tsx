"use client";

import { useEffect, useId, useRef, useState } from "react";
import { addDays, dubaiKey } from "@/lib/dates";

const week = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parse(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  return {
    day: `${match[1]}-${match[2]}-${match[3]}`,
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    hour: match[4] ? Number(match[4]) : 12,
    minute: match[5] ? Number(match[5]) : 0,
  };
}

function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<number | null> = Array.from({ length: first }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function dayTitle(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

export function WhenField({
  name,
  defaultValue = "",
  withTime = false,
}: {
  name: string;
  defaultValue?: string;
  withTime?: boolean;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [clock, setClock] = useState(() => {
    const initial = parse(defaultValue);
    return initial && defaultValue.includes("T") ? `${pad(initial.hour)}:${pad(initial.minute)}` : "";
  });
  const parsed = parse(value);
  const today = dubaiKey();
  const [cursor, setCursor] = useState(() => {
    const initial = parse(defaultValue);
    if (initial) return { year: initial.year, month: initial.month };
    const [year, month] = today.split("-").map(Number);
    return { year, month: month - 1 };
  });

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function chooseDay(day: string) {
    const [year, month] = day.split("-").map(Number);
    setCursor({ year, month: month - 1 });
    const time = clockTime(clock);
    setValue(withTime && time ? `${day}T${time}` : withTime ? day : day);
    setOpen(false);
  }

  function writeTime(raw: string) {
    const cleaned = raw.replace(/[^\d:]/g, "").slice(0, 5);
    setClock(cleaned);
    const time = clockTime(cleaned);
    if (!time) return;
    setValue(`${parsed?.day ?? today}T${time}`);
  }

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  }

  const shown = parsed ? dayTitle(parsed.day) : "בחירת תאריך";

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className="field flex items-center justify-between gap-3 text-start font-bold"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((state) => !state)}
      >
        <span className={parsed ? "" : "text-muted"}>{shown}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden="true">
          <rect x="3.5" y="4.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 8.5h13M7 3.5v2.5M13 3.5v2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div id={listId} role="dialog" aria-label="בחירת תאריך" className="absolute z-30 mt-2 w-full rounded-2xl border border-line bg-card p-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="min-h-11 rounded-xl border border-[#111111] text-sm font-bold" onClick={() => chooseDay(today)}>
              היום
            </button>
            <button type="button" className="min-h-11 rounded-xl border border-[#111111] text-sm font-bold" onClick={() => chooseDay(addDays(today, 1))}>
              מחר
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" className="grid size-10 place-items-center rounded-full bg-[#111111] text-white" aria-label="חודש קודם" onClick={() => shiftMonth(-1)}>
              <svg viewBox="0 0 20 20" className="h-4 w-4 rotate-180" aria-hidden="true">
                <path d="M12 5 7 10l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="text-base font-extrabold">{monthTitle(cursor.year, cursor.month)}</p>
            <button type="button" className="grid size-10 place-items-center rounded-full bg-[#111111] text-white" aria-label="חודש הבא" onClick={() => shiftMonth(1)}>
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5 7 10l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-muted">
            {week.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells(cursor.year, cursor.month).map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const key = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
              const selected = parsed?.day === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`grid aspect-square place-items-center rounded-full text-sm font-bold ${
                    selected ? "bg-[#111111] text-white" : key === today ? "border border-[#111111]" : ""
                  }`}
                  onClick={() => chooseDay(key)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {withTime ? (
        <input
          value={clock}
          inputMode="numeric"
          dir="ltr"
          placeholder="14:30"
          aria-label="שעה"
          className="field field-en mt-2"
          onChange={(event) => writeTime(event.target.value)}
          onBlur={() => {
            const time = clockTime(clock, true);
            if (!time) return;
            setClock(time);
            setValue(`${parsed?.day ?? today}T${time}`);
          }}
        />
      ) : null}
    </div>
  );
}

function clockTime(raw: string, loose = false) {
  const colon = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (colon) return stamp(Number(colon[1]), Number(colon[2]));
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 4) return stamp(Number(digits.slice(0, 2)), Number(digits.slice(2)));
  if (!loose) return "";
  if (digits.length === 3) return stamp(Number(digits.slice(0, 1)), Number(digits.slice(1)));
  if (digits.length === 1 || digits.length === 2) return stamp(Number(digits), 0);
  return "";
}

function stamp(hour: number, minute: number) {
  if (hour > 23 || minute > 59) return "";
  return `${pad(hour)}:${pad(minute)}`;
}
