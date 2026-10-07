"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { money } from "@/lib/domain";
import { collectionLabels } from "@/lib/store/i18n";
import { createClient } from "@/lib/supabase/browser";
import { deleteProduct, saveProduct } from "./actions";
import { menuCollections, type PriceRow, type ProductInput } from "./types";

const entities: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => entities[entity])
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textToHtml(text: string) {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("image"))), "image/webp", 0.85),
  );
}

const emptyRow = (): PriceRow => ({
  id: "",
  kept: "",
  label_he: "",
  price: "",
  compare: "",
  cost: "",
  grams: "",
  shortage: false,
});

export function ProductForm({ initial }: { initial: ProductInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [english, setEnglish] = useState(() => htmlToText(initial.body_en));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const multi = form.rows.length > 1 || form.rows.some((row) => row.kept.trim() !== "");

  function update(patch: Partial<ProductInput>) {
    setForm((current) => ({ ...current, ...patch }));
    setMessage("");
  }

  function updateRow(index: number, patch: Partial<PriceRow>) {
    update({ rows: form.rows.map((row, position) => (position === index ? { ...row, ...patch } : row)) });
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    const supabase = createClient();
    const added: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const blob = await shrink(file);
        const path = `products/${crypto.randomUUID()}.webp`;
        const { error: failed } = await supabase.storage.from("menu").upload(path, blob, { contentType: "image/webp" });
        if (failed) throw failed;
        added.push(supabase.storage.from("menu").getPublicUrl(path).data.publicUrl);
      } catch {
        setError("תמונה לא הועלתה. נסו קובץ JPG או PNG.");
      }
    }
    setForm((current) => ({ ...current, images: [...current.images, ...added] }));
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  function save() {
    setError("");
    setMessage("");
    const changedEnglish = english !== htmlToText(initial.body_en);
    start(async () => {
      const result = await saveProduct({ ...form, body_en: changedEnglish ? textToHtml(english) : initial.body_en });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (form.isNew && result.handle) {
        router.replace(`/menu/${result.handle}`);
        return;
      }
      setMessage("נשמר. מתעדכן בחנות עכשיו.");
      router.refresh();
    });
  }

  return (
    <div className={`flex flex-col gap-4 ${pending ? "pointer-events-none opacity-70" : ""}`}>
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">תמונות</h2>
        {form.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {form.images.map((image, index) => (
              <div key={image} className="relative">
                <img src={image} alt="" className="aspect-square w-full rounded-xl object-cover" />
                {index === 0 ? (
                  <span className="absolute start-1 top-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold text-white">
                    ראשית
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => update({ images: [image, ...form.images.filter((item) => item !== image)] })}
                    className="absolute start-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold"
                  >
                    לראשית
                  </button>
                )}
                <button
                  type="button"
                  aria-label="הסרת תמונה"
                  onClick={() => update({ images: form.images.filter((item) => item !== image) })}
                  className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-white/90 text-sm font-extrabold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">אין תמונה עדיין.</p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => upload(event.target.files)}
        />
        <button type="button" className="button-quiet" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? "מעלה..." : "+ הוספת תמונה"}
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">שם ותיאור</h2>
        <label className="flex flex-col gap-1 text-sm font-bold">
          שם בעברית
          <input className="field" value={form.title_he} onChange={(event) => update({ title_he: event.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          שם באנגלית
          <input
            className="field"
            dir="ltr"
            value={form.title_en}
            onChange={(event) => update({ title_en: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          תיאור בעברית
          <textarea
            className="field min-h-28 py-3 leading-6"
            value={form.body_he}
            onChange={(event) => update({ body_he: event.target.value })}
            placeholder="אם ריק, בעברית יוצג התיאור באנגלית"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          תיאור באנגלית
          <textarea
            className="field min-h-28 py-3 leading-6"
            dir="ltr"
            value={english}
            onChange={(event) => {
              setEnglish(event.target.value);
              setMessage("");
            }}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">קטגוריות בחנות</h2>
        <div className="grid grid-cols-2 gap-2">
          {menuCollections.map((handle) => {
            const on = form.collections.includes(handle);
            return (
              <button
                key={handle}
                type="button"
                onClick={() =>
                  update({
                    collections: on ? form.collections.filter((item) => item !== handle) : [...form.collections, handle],
                  })
                }
                className={`min-h-11 rounded-xl border text-sm font-extrabold ${
                  on ? "border-ink bg-ink text-white" : "border-line bg-card"
                }`}
              >
                {collectionLabels[handle]?.he ?? handle}
              </button>
            );
          })}
        </div>
        {form.collections.length === 0 ? (
          <p className="text-xs text-muted">בלי קטגוריה המוצר לא יופיע ברשימות של החנות.</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">מחיר, עלות ומלאי</h2>
        {multi ? (
          <label className="flex flex-col gap-1 text-sm font-bold">
            שם הבחירה באנגלית (למשל Quantity)
            <input
              className="field"
              dir="ltr"
              value={form.price_option}
              onChange={(event) => update({ price_option: event.target.value })}
            />
          </label>
        ) : null}
        {form.rows.map((row, index) => {
          const price = Number(row.price.replace(",", "."));
          const cost = Number(row.cost.replace(",", ".") || 0);
          return (
            <div key={row.id || `new-${index}`} className="flex flex-col gap-2 rounded-xl bg-paper p-3">
              {multi ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-bold">
                    אפשרות באנגלית
                    <input
                      className="field"
                      dir="ltr"
                      value={row.kept}
                      onChange={(event) => updateRow(index, { kept: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-bold">
                    אפשרות בעברית
                    <input
                      className="field"
                      value={row.label_he}
                      onChange={(event) => updateRow(index, { label_he: event.target.value })}
                    />
                  </label>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="מחיר ללקוח" value={row.price} onChange={(price) => updateRow(index, { price })} />
                <NumberField
                  label="מחיר לפני הנחה"
                  value={row.compare}
                  onChange={(compare) => updateRow(index, { compare })}
                />
                <NumberField label="עלות" value={row.cost} onChange={(value) => updateRow(index, { cost: value })} />
                <NumberField label="גרם" value={row.grams} onChange={(grams) => updateRow(index, { grams })} />
              </div>
              {Number.isFinite(price) && row.price !== "" ? (
                <p className="text-xs text-muted">נשאר על המנה {money(price - (Number.isFinite(cost) ? cost : 0))}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateRow(index, { shortage: !row.shortage })}
                  className={`min-h-10 flex-1 rounded-xl text-sm font-extrabold ${
                    row.shortage ? "bg-[#d64545] text-white" : "bg-[#e3f3e8] text-[#1b6a33]"
                  }`}
                >
                  {row.shortage ? "אזל" : "במלאי"}
                </button>
                {form.rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => update({ rows: form.rows.filter((_, position) => position !== index) })}
                    className="quick flex-1 text-[#d64545]"
                  >
                    הסרת אפשרות
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        <button type="button" className="button-quiet" onClick={() => update({ rows: [...form.rows, emptyRow()] })}>
          + אפשרות מחיר (גודל או כמות)
        </button>
      </section>

      <button
        type="button"
        onClick={() => update({ active: !form.active })}
        className={`min-h-12 rounded-2xl text-base font-extrabold ${
          form.active ? "bg-[#e3f3e8] text-[#1b6a33]" : "bg-[#ececec] text-muted"
        }`}
      >
        {form.active ? "מוצג בחנות · ללחוץ כדי להסתיר" : "מוסתר מהחנות · ללחוץ כדי להציג"}
      </button>

      {error ? <p className="text-sm font-bold text-[#d64545]">{error}</p> : null}
      {message ? <p className="text-sm font-bold text-[#1b6a33]">{message}</p> : null}
      <button type="button" className="button" disabled={pending || uploading} onClick={save}>
        {pending ? "שומר..." : form.isNew ? "יצירת מוצר" : "שמירה"}
      </button>

      {!form.isNew ? (
        confirming ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                start(async () => {
                  const result = await deleteProduct(form.handle);
                  if (result.error) setError(result.error);
                  else router.replace("/menu");
                })
              }
              className="min-h-12 flex-1 rounded-2xl bg-[#d64545] text-base font-extrabold text-white"
            >
              כן, למחוק
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="button-quiet flex-1">
              ביטול
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-12 rounded-2xl border border-[#d64545] bg-card text-base font-extrabold text-[#d64545]"
          >
            מחיקת מוצר
          </button>
        )
      ) : null}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold">
      {label}
      <input
        className="field"
        dir="ltr"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.,]/g, ""))}
      />
    </label>
  );
}
