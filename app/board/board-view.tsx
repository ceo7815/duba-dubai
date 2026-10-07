"use client";

import { useDeferredValue, useState } from "react";
import { Ticket } from "@/app/orders/ticket";
import { addDays, formatDay } from "@/lib/dates";
import { matchesQuery, type Haystack } from "@/lib/order-search";
import type { OrderRow } from "@/lib/orders";

type Entry = { order: OrderRow; day: string; haystack: Haystack };

export function BoardView({ entries, today }: { entries: Entry[]; today: string }) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = addDays(`${addDays(monthStart, 31).slice(0, 7)}-01`, -1);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const search = useDeferredValue(query.trim());

  const yesterday = addDays(today, -1);
  const isMonth = from === monthStart && to === monthEnd;
  const dated = Boolean(from || to);
  const [start, end] = from && to && from > to ? [to, from] : [from, to];

  const shown = entries.filter(
    (entry) =>
      (!start || entry.day >= start) &&
      (!end || entry.day <= end) &&
      (!search || matchesQuery(entry.haystack, search)),
  );
  if (!dated) shown.reverse();

  const groups = new Map<string, Entry[]>();
  for (const entry of shown) groups.set(entry.day, [...(groups.get(entry.day) ?? []), entry]);

  const setRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
  };

  const title = (day: string) =>
    day === yesterday ? `אתמול · ${formatDay(day)}` : day === today ? `היום · ${formatDay(day)}` : formatDay(day);

  return (
    <>
      <label className="field flex items-center gap-2 focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-ink">
        <svg
          viewBox="0 0 24 24"
          className="size-5 shrink-0 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="שם, טלפון, כתובת"
          aria-label="חיפוש הזמנה"
          className="min-w-0 flex-1 self-stretch bg-transparent outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          מתאריך
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="field" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          עד תאריך
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="field" />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-sm text-muted">
        <p>
          {search ? "נמצאו " : ""}
          {shown.length} הזמנות{" "}
          {isMonth ? "החודש" : dated ? "בתאריכים האלה" : "בכל התאריכים"}
        </p>
        {isMonth ? (
          search ? (
            <button type="button" onClick={() => setRange("", "")} className="shrink-0 font-extrabold text-ink underline">
              לחפש בכל התאריכים
            </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={() => setRange(monthStart, monthEnd)}
            className="shrink-0 font-extrabold text-ink underline"
          >
            חזרה לחודש הנוכחי
          </button>
        )}
      </div>

      {groups.size === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {search ? "לא נמצאה הזמנה שמתאימה לחיפוש" : "אין הזמנות בתאריכים האלה"}
        </p>
      ) : null}

      {[...groups].map(([day, rows]) => (
        <section id={`day-${day}`} key={day} className="flex scroll-mt-24 flex-col gap-2">
          <h2 className="text-base font-extrabold">
            {title(day)}
            {rows.length > 1 ? <span className="text-muted"> · {rows.length}</span> : null}
          </h2>
          {rows.map(({ order }) => (
            <Ticket key={order.id} order={order} href={`/orders/${order.id}`} />
          ))}
        </section>
      ))}
    </>
  );
}
