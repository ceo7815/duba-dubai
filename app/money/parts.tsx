import Link from "next/link";
import { money } from "@/lib/domain";
import { monthKey } from "@/lib/metrics";
import { monthLabel, shiftMonth } from "./data";

export function MonthNav({ path, month }: { path: string; month: string }) {
  const next = shiftMonth(month, 1);
  const canNext = next <= monthKey();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-2 py-1.5">
      <Link
        href={`${path}?month=${shiftMonth(month, -1)}`}
        className="rounded-xl px-3 py-2 text-sm font-extrabold"
      >
        → קודם
      </Link>
      <p className="text-base font-extrabold">{monthLabel(month)}</p>
      {canNext ? (
        <Link
          href={`${path}?month=${next}`}
          className="rounded-xl px-3 py-2 text-sm font-extrabold"
        >
          הבא ←
        </Link>
      ) : (
        <span className="px-3 py-2 text-sm font-extrabold text-muted/40">
          הבא ←
        </span>
      )}
    </div>
  );
}

export function Totals({
  rows,
  total,
}: {
  rows: { label: string; value: number; hint?: string }[];
  total: { label: string; value: number };
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span>
              {row.label}
              {row.hint ? (
                <span className="text-muted"> · {row.hint}</span>
              ) : null}
            </span>
            <span className="font-bold" dir="ltr">
              {money(row.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <span className="font-extrabold">{total.label}</span>
        <span className="text-2xl font-extrabold" dir="ltr">
          {money(total.value)}
        </span>
      </div>
    </section>
  );
}
