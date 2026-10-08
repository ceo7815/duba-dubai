"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MenuField } from "@/app/menu-field";
import { MenuPicker } from "@/app/orders/menu-picker";
import { PackageList, PackageSheet, packProblem, type Pack } from "@/app/orders/package-builder";
import { packsFromItems, type PackageRule } from "@/lib/packages";
import { PhoneField } from "@/app/phone-field";
import { paymentLink } from "@/lib/payment-link";
import { WhenField } from "@/app/when-field";
import { saveOrder } from "@/app/orders/actions";
import type { MenuDish } from "@/lib/catalog";
import {
  aedValue,
  currencies,
  currencyOf,
  foreignTotal,
  formatCurrency,
  formatRate,
  isCurrency,
  validRate,
  type Currency,
  type Rates,
} from "@/lib/currency";
import {
  fulfillmentLabels,
  fulfillments,
  handlers,
  isHandler,
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
  rates,
  packages,
}: {
  dishes: MenuDish[];
  packages: PackageRule[];
  autoLink?: boolean;
  rates: Rates;
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
    currency: string;
    currency_rate: number;
    handled_by: string | null;
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
  const [handledBy, setHandledBy] = useState(order?.handled_by ?? "");
  const [handlerMissing, setHandlerMissing] = useState(false);
  const [currency, setCurrency] = useState<Currency>(
    order && isCurrency(order.currency) ? order.currency : "AED",
  );
  const [rate, setRate] = useState(() =>
    order && order.currency !== "AED" ? String(Number(order.currency_rate)) : "",
  );
  const packageIds = useMemo(() => new Set(packages.map((rule) => rule.id)), [packages]);
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const item of items ?? []) {
      if (item.dish_id && !packageIds.has(item.dish_id))
        next[item.dish_id] = (next[item.dish_id] ?? 0) + item.quantity;
    }
    return next;
  });
  const [packs, setPacks] = useState<Pack[]>(() =>
    packsFromItems(items ?? [], packages).map((pack, index) => ({ ...pack, key: `p${index}` })),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const editingPack = packs.find((pack) => pack.key === editing);
  const editingRule = editingPack && packages.find((rule) => rule.id === editingPack.packageId);
  const packCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rule of packages) counts[rule.id] = 0;
    for (const pack of packs) counts[pack.packageId] = (counts[pack.packageId] ?? 0) + 1;
    return counts;
  }, [packages, packs]);

  const closePack = useCallback(() => setEditing(null), []);

  function addPack(packageId: string) {
    const key = `p${Date.now()}`;
    setPacks((current) => [...current, { key, packageId, picks: {} }]);
    setEditing(key);
  }

  const suggested = useMemo(
    () =>
      dishes.reduce((sum, dish) => sum + (qty[dish.id] ?? 0) * Number(dish.price), 0) +
      packs.reduce((sum, pack) => sum + (packages.find((rule) => rule.id === pack.packageId)?.price ?? 0), 0),
    [dishes, qty, packs, packages],
  );
  const deliveryFee = Number(delivery.replace(",", "."));
  const suggestedTotal = suggested + (Number.isFinite(deliveryFee) ? deliveryFee : 0);

  useEffect(() => {
    if (!amountTouched) setAmount(suggestedTotal ? String(suggestedTotal) : "");
  }, [amountTouched, suggestedTotal]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const aedTotal = Number(amount.replace(",", "."));
  const rateValue = Number(rate.replace(",", "."));
  const foreign = currency === "AED" ? 0 : foreignTotal(aedTotal, rateValue);
  const customerTotal = currency === "AED" ? aedTotal : foreign;

  function pickCurrency(next: Currency) {
    setCurrency(next);
    if (next === "AED") return;
    setRate(order?.currency === next ? String(Number(order.currency_rate)) : String(rates[next]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHandler(handledBy)) {
      setHandlerMissing(true);
      document.getElementById("handled-by")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const problem = packProblem(packages, packs);
    if (problem) {
      setError(problem.text);
      setEditing(problem.key);
      return;
    }
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
      <input type="hidden" name="handled_by" value={handledBy} />
      <section
        id="handled-by"
        className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 ${handlerMissing ? "border-ink" : "border-line"}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-extrabold">מי טיפל בהזמנה</h2>
          <span className="text-[11px] font-bold text-muted">פנימי · הלקוח לא רואה</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="מי טיפל בהזמנה">
          {handlers.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={handledBy === name}
              onClick={() => {
                setHandledBy(name);
                setHandlerMissing(false);
              }}
              className={`min-h-12 rounded-xl border text-[15px] font-extrabold ${
                handledBy === name ? "border-ink bg-ink text-white" : "border-line bg-card"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        {handlerMissing ? <p className="text-sm font-bold">צריך לבחור מי טיפל בהזמנה</p> : null}
      </section>
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
        <PackageList
          rules={packages}
          packs={packs}
          onEdit={setEditing}
          onRemove={(key) => setPacks((current) => current.filter((pack) => pack.key !== key))}
        />
        <MenuPicker
          dishes={dishes}
          qty={qty}
          onChange={(id, next) => setQty((current) => ({ ...current, [id]: Math.max(0, next) }))}
          packs={packCounts}
          onPackage={addPack}
        />
      </section>
      {editingPack && editingRule ? (
        <PackageSheet
          rule={editingRule}
          picks={editingPack.picks}
          onChange={(picks) =>
            setPacks((current) => current.map((pack) => (pack.key === editingPack.key ? { ...pack, picks } : pack)))
          }
          onExtra={(dishId) => setQty((current) => ({ ...current, [dishId]: (current[dishId] ?? 0) + 1 }))}
          onClose={closePack}
        />
      ) : null}

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
          {currency === "AED"
            ? Number.isFinite(deliveryFee) && deliveryFee > 0
              ? "כולל משלוח"
              : "סה״כ לתשלום"
            : `סה״כ בדירהם${Number.isFinite(deliveryFee) && deliveryFee > 0 ? " · כולל משלוח" : ""}`}
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

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold">מטבע ללקוח</span>
          <input type="hidden" name="currency" value={currency} />
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="מטבע ללקוח">
            {currencies.map((item) => (
              <button
                key={item.code}
                type="button"
                role="radio"
                aria-checked={currency === item.code}
                onClick={() => pickCurrency(item.code)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl border text-center ${
                  currency === item.code ? "border-ink bg-ink text-white" : "border-line bg-card"
                }`}
              >
                <span className="text-sm font-extrabold leading-tight">
                  {item.flag} {item.label}
                </span>
                <span className={`text-[11px] font-bold ${currency === item.code ? "text-white/70" : "text-muted"}`}>
                  {item.symbol}
                </span>
              </button>
            ))}
          </div>

          {currency !== "AED" ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-paper p-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <span className="shrink-0">
                  שער · 1 {currencyOf(currency).symbol} =
                </span>
                <input
                  name="currency_rate"
                  required
                  inputMode="decimal"
                  dir="ltr"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  className="field field-en !min-h-11 min-w-0 flex-1"
                />
                <span className="shrink-0">AED</span>
              </label>
              {Number(rate) !== rates[currency] && validRate(rateValue) ? (
                <button
                  type="button"
                  onClick={() => setRate(String(rates[currency]))}
                  className="self-start text-xs font-bold text-muted underline"
                >
                  חזרה לשער הקבוע ({formatRate(rates[currency])})
                </button>
              ) : null}
              <div className="rounded-xl bg-card px-3 py-3">
                <p className="text-xs font-bold text-muted">הלקוח משלם</p>
                <p className="text-2xl font-extrabold" dir="ltr">
                  {foreign > 0 ? formatCurrency(foreign, currency) : "—"}
                </p>
                {foreign > 0 ? (
                  <p className="mt-1 text-xs text-muted">
                    מעוגל לעשרות · נרשם בדוחות כ-{formatCurrency(aedValue(foreign, rateValue), "AED")}
                  </p>
                ) : !validRate(rateValue) && rate ? (
                  <p className="mt-1 text-xs font-bold text-red-700">השער לא תקין</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

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
              {customerTotal > 0 ? (
                <>
                  {" "}
                  על <bdi className="font-extrabold text-ink">{formatCurrency(customerTotal, currency)}</bdi>
                </>
              ) : null}{" "}
              ומדביקים כאן. הלקוח יקבל אותו בסיכום ההזמנה.
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
