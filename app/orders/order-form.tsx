"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MenuField } from "@/app/menu-field";
import { MenuPicker } from "@/app/orders/menu-picker";
import { PhoneField } from "@/app/phone-field";
import { paymentLink } from "@/lib/payment-link";
import { WhenField } from "@/app/when-field";
import { saveOrder } from "@/app/orders/actions";
import type { MenuDish } from "@/lib/catalog";
import {
  fulfillmentLabels,
  fulfillments,
  needsDestination,
  orderKindLabels,
  orderKinds,
  type Fulfillment,
  type OrderKind,
} from "@/lib/domain";

function waPhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `971${digits.slice(1)}`;
  return digits;
}

export function OrderForm({
  order,
  items,
  dishes,
  autoLink = false,
}: {
  dishes: MenuDish[];
  autoLink?: boolean;
  order?: {
    id: string;
    customer_name: string;
    phone: string;
    scheduled_at: string;
    order_kind: string;
    fulfillment: string;
    destination: string;
    guest_count: number | null;
    guest_note: string;
    leaves_at: string;
    allergy: string;
    special_request: string;
    delivery_fee: number;
    tray_deposit: number;
    tray_return: number;
    salad_note: string;
    is_quote: boolean;
    ending: string | null;
    amount: number;
    paid: number;
    shopify_url: string;
  };
  items?: { dish_id: string | null; name: string; quantity: number; unit_price: number }[];
}) {
  const router = useRouter();
  const [pay, setPay] = useState<"card" | "cash" | "">(
    order?.ending === "cash" ? "cash" : order?.ending === "shopify_link" || order?.ending === "shopify_paid" ? "card" : "",
  );
  const [link, setLink] = useState(() => paymentLink(order?.shopify_url ?? "") ?? "");
  const [linkOpen, setLinkOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [linkError, setLinkError] = useState("");
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState<OrderKind>(
    (order?.order_kind as OrderKind) ?? "shabbat_couple",
  );
  const [fulfillment, setFulfillment] = useState<Fulfillment>(
    (order?.fulfillment as Fulfillment) ?? "delivery",
  );
  const [allergy, setAllergy] = useState(order?.allergy ?? "");
  const [delivery, setDelivery] = useState(order ? String(order.delivery_fee) : "");
  const [amount, setAmount] = useState(order ? String(order.amount) : "");
  const [amountTouched, setAmountTouched] = useState(Boolean(order));
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const item of items ?? []) {
      if (item.dish_id) next[item.dish_id] = item.quantity;
    }
    return next;
  });

  const suggested = useMemo(
    () => dishes.reduce((sum, dish) => sum + (qty[dish.id] ?? 0) * Number(dish.price), 0),
    [dishes, qty],
  );
  const deliveryFee = Number(delivery.replace(",", "."));
  const suggestedTotal = suggested + (Number.isFinite(deliveryFee) ? deliveryFee : 0);

  useEffect(() => {
    if (!amountTouched) setAmount(suggestedTotal ? String(suggestedTotal) : "");
  }, [amountTouched, suggestedTotal]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pay !== "card" && pay !== "cash") {
      setError("צריך אופן תשלום");
      return;
    }
    if (pay === "card" && !link && !autoLink) {
      openLink();
      return;
    }
    const popup = window.open("about:blank", "_blank");
    setPending(true);
    setError("");
    const result = await saveOrder(null, new FormData(event.currentTarget));
    setPending(false);
    if (result && "error" in result && result.error) {
      popup?.close();
      if ("needsLink" in result && result.needsLink) {
        setPay("card");
        openLink();
        setLinkError(result.error);
        return;
      }
      if (result.id) router.push(`/orders/${result.id}`);
      else setError(result.error);
      return;
    }
    if (result && "message" in result && result.message && result.phone) {
      const url = `https://wa.me/${waPhone(result.phone)}?text=${encodeURIComponent(result.message)}`;
      if (popup) popup.location.href = url;
      else window.open(url, "_blank", "noopener");
    }
    if (result && "id" in result) router.push(`/orders/${result.id}`);
  }

  function openLink() {
    setDraft(link);
    setLinkError("");
    setLinkOpen(true);
  }

  function closeLink() {
    setLinkOpen(false);
  }

  function saveLink() {
    const value = draft.trim();
    if (!value && autoLink) {
      setLink("");
      setPay("card");
      setLinkOpen(false);
      return;
    }
    const clean = paymentLink(value);
    if (!clean) {
      setLinkError(value ? "זה לא נראה כמו קישור Stripe. צריך להתחיל ב-https://buy.stripe.com" : "צריך להדביק קישור");
      return;
    }
    setLink(clean);
    setPay("card");
    setLinkOpen(false);
  }

  function applyKind(next: OrderKind) {
    setKind(next);
    if (next === "pickup") setFulfillment("pickup");
    if (next === "hotel") setFulfillment("hotel");
    if (next === "yacht") setFulfillment("yacht");
    if (next === "hotel_five") setFulfillment("five_kitchen");
    if (next === "hosting") setFulfillment("hosting");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {order ? <input type="hidden" name="id" value={order.id} /> : null}
      <input type="hidden" name="origin" value={origin} />
      <input type="hidden" name="paid" value={order?.paid ?? 0} />
      <input type="hidden" name="payment_method" value={pay} />
      <input type="hidden" name="payment_url" value={pay === "card" ? link : ""} />
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">למי</h2>
        <label className="flex flex-col gap-2 text-sm font-bold">
          שם
          <input name="customer_name" required defaultValue={order?.customer_name} className="field" />
        </label>
        <div className="flex flex-col gap-2 text-sm font-bold">
          טלפון
          <PhoneField name="phone" defaultValue={order?.phone} />
        </div>
        <label className="flex flex-col gap-2 text-sm font-bold">
          מלון
          <input
            name="destination"
            required={needsDestination(fulfillment)}
            placeholder="מלון פייב לאקס"
            defaultValue={order?.destination}
            className="field"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">מתי</h2>
        <label className="flex flex-col gap-2 text-sm font-bold">
          תאריך ושעה
          <WhenField name="scheduled_at" defaultValue={order?.scheduled_at} withTime />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold">
          יוצא בשעה
          <input
            name="leaves_at"
            dir="ltr"
            placeholder="12"
            defaultValue={order?.leaves_at}
            className="field field-en"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">לכמה</h2>
        <label className="flex items-center gap-3 text-sm font-bold">
          <input type="checkbox" name="is_quote" value="1" defaultChecked={order?.is_quote} className="size-5" />
          הצעת מחיר
        </label>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <label className="flex flex-col gap-2 text-sm font-bold">
            נפשות
            <input
              name="guest_count"
              inputMode="numeric"
              dir="ltr"
              placeholder="6"
              defaultValue={order?.guest_count ?? ""}
              className="field field-en"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold">
            פירוט
            <input name="guest_note" placeholder="זוג + 4" defaultValue={order?.guest_note} className="field" />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">המנות</h2>
        <MenuPicker
          dishes={dishes}
          qty={qty}
          onChange={(id, next) => setQty((current) => ({ ...current, [id]: Math.max(0, next) }))}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">לתשלום</h2>
        <p className="text-sm text-muted">סה״כ מנות {suggested || 0}</p>
        <label className="flex flex-col gap-2 text-sm font-bold">
          משלוח
          <input
            name="delivery_fee"
            inputMode="decimal"
            dir="ltr"
            value={delivery}
            onChange={(event) => setDelivery(event.target.value)}
            className="field field-en"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold">
          {Number.isFinite(deliveryFee) && deliveryFee > 0 ? "כולל משלוח" : "סה״כ לתשלום"}
          <input
            name="amount"
            required
            inputMode="decimal"
            dir="ltr"
            value={amount}
            onChange={(event) => {
              setAmountTouched(true);
              setAmount(event.target.value);
            }}
            className="field field-en"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-2 text-sm font-bold">
            פלטה בפיקדון
            <input
              name="tray_deposit"
              inputMode="decimal"
              dir="ltr"
              defaultValue={order?.tray_deposit || ""}
              className="field field-en"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold">
            בחזרה
            <input
              name="tray_return"
              inputMode="decimal"
              dir="ltr"
              defaultValue={order?.tray_return || ""}
              className="field field-en"
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">למטבח</h2>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold" htmlFor="allergy">
            אלרגיה
          </label>
          <input
            id="allergy"
            name="allergy"
            required
            value={allergy}
            onChange={(event) => setAllergy(event.target.value)}
            className="field"
          />
          <button type="button" className="button-quiet" onClick={() => setAllergy("אין")}>
            אין אלרגיה
          </button>
        </div>
        <label className="flex flex-col gap-2 text-sm font-bold">
          בקשה
          <textarea
            name="special_request"
            rows={2}
            defaultValue={order?.special_request}
            className="field py-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold">
          סוג
          <MenuField
            name="order_kind"
            value={kind}
            onChange={(next) => applyKind(next as OrderKind)}
            options={orderKinds.map((item) => ({ value: item, label: orderKindLabels[item] }))}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold">
          אספקה
          <MenuField
            name="fulfillment"
            value={fulfillment}
            onChange={(next) => setFulfillment(next as Fulfillment)}
            options={fulfillments.map((item) => ({ value: item, label: fulfillmentLabels[item] }))}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-base font-extrabold">אופן תשלום</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`min-h-24 rounded-2xl px-3 text-center ${pay === "card" ? "bg-[#111111] text-white" : "border border-[#111111] bg-white"}`}
            onClick={openLink}
          >
            <span className="block text-base font-extrabold">כרטיס אשראי</span>
            <span className="mt-1 block text-xs font-bold opacity-80">
              {pay === "card" && link ? "קישור Stripe מוכן ✓" : "אישור וקישור לתשלום"}
            </span>
          </button>
          <button
            type="button"
            className={`min-h-24 rounded-2xl px-3 text-center ${pay === "cash" ? "bg-[#111111] text-white" : "border border-[#111111] bg-white"}`}
            onClick={() => setPay("cash")}
          >
            <span className="block text-base font-extrabold">מזומן במסירה</span>
            <span className="mt-1 block text-xs font-bold opacity-80">אישור הזמנה</span>
          </button>
        </div>
        {pay === "card" && link ? (
          <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-xs">
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-medium">
              {link}
            </span>
            <button type="button" onClick={openLink} className="shrink-0 font-extrabold underline">
              שינוי
            </button>
          </div>
        ) : null}
      </section>

      {linkOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
          onClick={closeLink}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-link-title"
            className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="pay-link-title" className="text-lg font-extrabold">
              קישור תשלום Stripe
            </h2>
            <p className="mt-1 text-sm text-muted">
              יוצרים קישור תשלום ב-Stripe
              {Number(amount) > 0 ? ` על ${Number(amount).toLocaleString("en-US")} AED` : ""} ומדביקים כאן. הלקוח יקבל
              אותו בסיכום ההזמנה.
            </p>
            <input
              autoFocus
              dir="ltr"
              type="url"
              inputMode="url"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setLinkError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveLink();
                }
              }}
              placeholder="https://buy.stripe.com/..."
              className="field field-en mt-4"
            />
            {linkError ? (
              <p role="alert" className="mt-2 text-sm font-bold text-red-700">
                {linkError}
              </p>
            ) : null}
            {autoLink ? (
              <p className="mt-2 text-xs text-muted">אפשר להשאיר ריק, והמערכת תיצור קישור לבד.</p>
            ) : null}
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button type="button" onClick={saveLink} className="button">
                שמירת הקישור
              </button>
              <button
                type="button"
                onClick={closeLink}
                className="min-h-[3.25rem] rounded-2xl border border-line px-5 text-sm font-bold"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-bold">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending || !pay} className="button">
        {pending ? "שומרים" : pay ? "שליחת סיכום ללקוח" : "בחירת אופן תשלום"}
      </button>
    </form>
  );
}
