import Link from "next/link";
import { formatDay } from "@/lib/dates";
import { monthLabel } from "./data";
import { periods, stepAnchor, type Window } from "./income/analytics";

export function hrefFor(basePath: string, span: Pick<Window, "period" | "anchor" | "start" | "end">) {
  const query = new URLSearchParams({ p: span.period });
  if (span.period === "range") {
    query.set("from", span.start);
    query.set("to", span.end);
  } else {
    query.set("d", span.anchor);
  }
  return `${basePath}?${query}`;
}

export const shortDate = (key: string) => `${Number(key.slice(8))}.${Number(key.slice(5, 7))}`;

export function spanLabel(span: Window, today: string) {
  if (span.period === "day") return span.anchor === today ? `היום · ${formatDay(span.anchor)}` : formatDay(span.anchor);
  if (span.period === "week") return `שבוע ${shortDate(span.start)}–${shortDate(span.end)}`;
  if (span.period === "month") return monthLabel(span.start.slice(0, 7));
  if (span.period === "year") return `${span.start.slice(0, 4)} · מתחילת השנה`;
  return `${shortDate(span.start)}.${span.start.slice(0, 4)} – ${shortDate(span.end)}.${span.end.slice(0, 4)}`;
}

export function PeriodPicker({ basePath, span, today }: { basePath: string; span: Window; today: string }) {
  return (
    <>
      <nav className="grid grid-cols-5 gap-1 rounded-2xl bg-[#e6e6e6] p-1" aria-label="תקופה">
        {periods.map((item) => (
          <Link
            key={item.id}
            href={hrefFor(basePath, { ...span, period: item.id })}
            className={`flex min-h-10 items-center justify-center rounded-xl px-1 text-center text-[13px] font-extrabold leading-tight ${
              span.period === item.id ? "bg-ink text-white shadow-sm" : "text-ink/70"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {span.period === "range" ? (
        <form action={basePath} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <input type="hidden" name="p" value="range" />
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            מתאריך
            <input type="date" name="from" defaultValue={span.start} className="field" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            עד תאריך
            <input type="date" name="to" defaultValue={span.end} className="field" />
          </label>
          <button className="button min-h-[3.25rem] px-4">הצג</button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Link
            href={hrefFor(basePath, { ...span, anchor: stepAnchor(span, -1) })}
            aria-label="תקופה קודמת"
            className="flex size-11 items-center justify-center rounded-full border border-line bg-card text-lg font-extrabold"
          >
            ›
          </Link>
          <div className="text-center">
            <p className="text-base font-extrabold">{spanLabel(span, today)}</p>
            {!(span.start <= today && today <= span.end) ? (
              <Link
                href={hrefFor(basePath, { ...span, anchor: today })}
                className="text-xs font-bold text-muted underline"
              >
                חזרה להיום
              </Link>
            ) : null}
          </div>
          <Link
            href={hrefFor(basePath, { ...span, anchor: stepAnchor(span, 1) })}
            aria-label="תקופה הבאה"
            className="flex size-11 items-center justify-center rounded-full border border-line bg-card text-lg font-extrabold"
          >
            ‹
          </Link>
        </div>
      )}
    </>
  );
}

export function Delta({
  current,
  previous,
  invert = false,
  dark = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
  dark?: boolean;
}) {
  if (previous <= 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  const good = invert ? change <= 0 : change >= 0;
  const tone = dark
    ? good
      ? "bg-white text-[#111111]"
      : "bg-white/15 text-white"
    : good
      ? "bg-ink text-white"
      : "bg-[#e3e3e3] text-ink";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${tone}`}>
      {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
    </span>
  );
}
