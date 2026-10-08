"use client";

import { useState } from "react";

export function DownloadPdf({ fileName }: { fileName: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const pages = Array.from(document.querySelectorAll<HTMLElement>(".order-print article"));
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      for (const [index, page] of pages.entries()) {
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 1000,
          onclone: (_doc, element) => {
            element.style.width = "794px";
            element.style.maxWidth = "none";
            element.style.minHeight = "1123px";
            element.style.boxShadow = "none";
            element.querySelectorAll<HTMLElement>(".tabular-nums").forEach((node) => {
              node.style.fontVariantNumeric = "normal";
              node.style.direction = "ltr";
            });
          },
        });
        const height = Math.min(297, (canvas.height * 210) / canvas.width);
        if (index > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, height);
      }
      pdf.save(fileName);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="rounded-full border border-[#111111] bg-white px-5 py-2.5 text-sm font-extrabold disabled:opacity-60"
    >
      {busy ? "מכינים PDF…" : "הורדת PDF"}
    </button>
  );
}
