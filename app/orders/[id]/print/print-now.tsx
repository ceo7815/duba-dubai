"use client";

export function PrintNow() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-[#111111] px-5 py-2.5 text-sm font-extrabold text-white"
    >
      הדפסה או שמירה כ-PDF
    </button>
  );
}
