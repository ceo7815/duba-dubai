"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteCustomer } from "./actions";

export type CustomerCard = {
  key: string;
  name: string;
  phone: string;
  orders: number;
  total: string;
  last: string;
  next: string;
  activity: string;
  search: string;
};

type Sort = "recent" | "name" | "orders";

const sorts: { id: Sort; label: string }[] = [
  { id: "recent", label: "אחרונים" },
  { id: "name", label: "א–ת" },
  { id: "orders", label: "הכי הרבה הזמנות" },
];

const digitsOf = (value: string) => value.replace(/\D/g, "");
const textOf = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7\u0300-\u036f]/g, "")
    .replace(/[״׳"'`.\-_,()]/g, "");

function matches(customer: CustomerCard, query: string) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = textOf(`${customer.name} ${customer.search} ${customer.phone}`);
  const phones = [customer.key, digitsOf(customer.phone)];

  return words.every((word) => {
    const digits = digitsOf(word);
    if (digits.length >= 2 && digits.length >= word.replace(/[\s+\-()]/g, "").length) {
      const local = digits.replace(/^0+/, "");
      return phones.some((phone) => phone.includes(digits) || (local.length >= 2 && phone.includes(local)));
    }
    return text.includes(textOf(word));
  });
}

export function CustomerList({ customers }: { customers: CustomerCard[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState("");

  const visible = useMemo(() => {
    const list = customers.filter((customer) => !removed.includes(customer.key) && matches(customer, query));
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "he");
      if (sort === "orders") return b.orders - a.orders || b.activity.localeCompare(a.activity);
      return b.activity.localeCompare(a.activity);
    });
  }, [customers, removed, query, sort]);

  const total = customers.length - removed.length;

  function remove(customer: CustomerCard) {
    const note = customer.orders
      ? `\nההזמנות שלו (${customer.orders}) יישארו במערכת.`
      : "";
    if (!window.confirm(`למחוק את הכרטיס של ${customer.name}?${note}`)) return;
    setError("");
    setBusy(customer.key);
    start(async () => {
      const result = await deleteCustomer(customer.key);
      if (result.error) setError(result.error);
      else setRemoved((list) => [...list, customer.key]);
      setBusy("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-paper/95 px-4 pb-2 pt-1 backdrop-blur">
        <label className="relative block">
          <span className="sr-only">חיפוש לקוח</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="שם, טלפון או מלון"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-13 w-full rounded-2xl border border-line bg-card ps-12 pe-11 text-base font-bold outline-none placeholder:font-normal placeholder:text-muted focus:border-ink"
          />
          {query ? (
            <button
              type="button"
              aria-label="ניקוי החיפוש"
              onClick={() => setQuery("")}
              className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-lg font-bold text-muted"
            >
              ×
            </button>
          ) : null}
        </label>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {sorts.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSort(option.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                  sort === option.id ? "border-ink bg-ink text-white" : "border-line bg-card"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-xs font-bold text-muted">
            {query ? `${visible.length} מתוך ${total}` : `${total} לקוחות`}
          </span>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-ink bg-card px-4 py-3 text-sm font-bold">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          לא נמצא לקוח עבור “{query}”
        </p>
      ) : (
        visible.map((customer) => (
          <article
            key={customer.key}
            className={`flex items-stretch overflow-hidden rounded-2xl border border-line bg-card transition-opacity ${
              busy === customer.key && pending ? "opacity-40" : ""
            }`}
          >
            <Link href={`/customers/${customer.key}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-base font-extrabold text-white">
                {initials(customer.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-extrabold">{customer.name}</span>
                <bdi dir="ltr" className="mt-0.5 block truncate text-end text-sm font-bold text-muted">
                  {customer.phone}
                </bdi>
                <span className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  <span className="rounded-full bg-paper px-2 py-0.5">
                    {customer.orders === 0
                      ? "אין הזמנות"
                      : customer.orders === 1
                        ? "הזמנה אחת"
                        : `${customer.orders} הזמנות`}
                  </span>
                  {customer.total ? (
                    <span className="rounded-full bg-paper px-2 py-0.5" dir="ltr">
                      {customer.total}
                    </span>
                  ) : null}
                  {customer.next ? (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-white">הבאה {customer.next}</span>
                  ) : customer.last ? (
                    <span className="rounded-full bg-paper px-2 py-0.5 text-muted">אחרונה {customer.last}</span>
                  ) : null}
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={`מחיקת ${customer.name}`}
              disabled={pending}
              onClick={() => remove(customer)}
              className="flex w-12 shrink-0 items-center justify-center border-s border-line text-muted active:bg-paper disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
              </svg>
            </button>
          </article>
        ))
      )}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}
