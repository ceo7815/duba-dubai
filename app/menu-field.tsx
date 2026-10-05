"use client";

import { useEffect, useId, useRef, useState } from "react";

export function MenuField({
  name,
  options,
  value,
  defaultValue,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? inner;
  const label = options.find((option) => option.value === current)?.label ?? "";

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

  function choose(next: string) {
    if (value === undefined) setInner(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={current} />
      <button
        type="button"
        className="field flex items-center justify-between gap-3 text-start font-bold"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((state) => !state)}
      >
        <span>{label}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-line bg-card p-1"
        >
          {options.map((option) => {
            const selected = option.value === current;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex min-h-12 w-full items-center rounded-xl px-3 text-start text-base font-bold ${
                    selected ? "bg-[#111111] text-white" : "text-[#111111]"
                  }`}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
