"use client";

export function PrintSheet() {
  return (
    <button type="button" className="text-sm font-medium text-[#8a8175] underline decoration-[#d9d1c7] underline-offset-4 no-print" onClick={() => window.print()}>
      שמירה כ-PDF
    </button>
  );
}
