"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DateRange } from "@/app/date-range";

export type OrderQuery = {
  q: string;
  range: string;
  from: string;
  to: string;
  stage: string;
};

const ranges = [
  { key: "today", label: "היום" },
  { key: "tomorrow", label: "מחר" },
  { key: "week", label: "השבוע" },
];

const stages = [
  { key: "waiting", label: "ממתין לאישור" },
  { key: "kitchen", label: "במטבח" },
  { key: "out", label: "יצא ללקוח" },
];

export function OrderFilters({ query }: { query: OrderQuery }) {
  const router = useRouter();
  const [text, setText] = useState(query.q);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function go(patch: Partial<OrderQuery>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, ...patch })) if (value) params.set(key, value);
    const search = params.toString();
    start(() => router.replace(search ? `/orders?${search}` : "/orders", { scroll: false }));
  }

  return (
    <div className={`flex flex-col gap-2 ${pending ? "opacity-70" : ""}`}>
      <div className="relative">
        <input
          type="search"
          value={text}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => go({ q: value.trim() }), 300);
          }}
          placeholder="חיפוש לפי שם, טלפון או כתובת"
          className="field !rounded-xl !ps-10"
        />
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {ranges.map((range) => (
          <button
            key={range.key}
            type="button"
            onClick={() => go({ range: query.range === range.key ? "" : range.key, from: "", to: "" })}
            className={chip(query.range === range.key)}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {stages.map((stage) => (
          <button
            key={stage.key}
            type="button"
            onClick={() => go({ stage: query.stage === stage.key ? "" : stage.key })}
            className={chip(query.stage === stage.key)}
          >
            {stage.label}
          </button>
        ))}
      </div>

      <div className="flex items-stretch gap-1.5">
        <div className="min-w-0 flex-1">
          <DateRange
            from={query.from}
            to={query.to}
            onChange={(range) => go({ ...range, range: "" })}
            label="טווח תאריכים"
          />
        </div>
        {query.from || query.to ? (
          <button type="button" onClick={() => go({ from: "", to: "" })} className="quick rounded-xl px-3">
            ניקוי
          </button>
        ) : null}
      </div>
    </div>
  );
}

function chip(on: boolean) {
  return `min-h-11 rounded-xl text-sm font-extrabold ${on ? "bg-[#111111] text-white" : "bg-card text-ink"}`;
}
