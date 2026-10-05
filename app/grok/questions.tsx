"use client";

import { useState } from "react";

export function Questions({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <article key={item.question} className="rounded-2xl border border-line bg-card px-4 py-4">
          <button
            type="button"
            className="w-full text-start text-base font-extrabold"
            onClick={() => setOpen(open === index ? null : index)}
          >
            {item.question}
          </button>
          {open === index ? <p className="mt-3 text-sm leading-6">{item.answer}</p> : null}
        </article>
      ))}
    </div>
  );
}
