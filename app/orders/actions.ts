"use server";

import { done } from "@/lib/flash";
import { randomInt } from "crypto";
import { networkInterfaces } from "os";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/auth-actions";
import { fromDubaiInput } from "@/lib/dates";
import { customerMessage } from "@/lib/sheet";
import {
  isFulfillment,
  isHandler,
  isOrderKind,
  isSource,
  isStatus,
  needsDestination,
  nextSteps,
  stepPatch,
  type OrderStatus,
} from "@/lib/domain";
import { aedValue, foreignTotal, isCurrency, validRate } from "@/lib/currency";
import { guestLang } from "@/lib/guest-text";
import { loadPackages } from "@/lib/package-rules";
import { buildPackLines } from "@/lib/packages";
import { normalizePhone } from "@/lib/phone";
import { getProfile } from "@/lib/profile";
import { paymentLink } from "@/lib/payment-link";
import { stripeCheckout, stripeReady } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { canOperate } from "@/lib/roles";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function moneyField(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : Number.NaN;
}

async function owner() {
  const profile = await getProfile();
  if (!canOperate(profile?.role)) return null;
  return profile;
}

export async function saveOrder(
  _state: FormState,
  formData: FormData,
): Promise<
  | { error: string; id?: string; needsLink?: boolean }
  | { id: string; phone?: string; message?: string }
> {
  if (!(await owner())) return { error: "אין לך הרשאה לשמור הזמנה" };

  const id = field(formData, "id");
  const customerName = field(formData, "customer_name");
  const normalized = normalizePhone(field(formData, "phone"));
  if (!normalized) return { error: "מספר הטלפון לא תקין. בחרו מדינה והקלידו את המספר" };
  const { phone, key } = normalized;
  const when = field(formData, "scheduled_at");
  const orderKind = field(formData, "order_kind");
  const fulfillment = field(formData, "fulfillment");
  const destination = field(formData, "destination");
  const guests = field(formData, "guest_count");
  const guestNote = field(formData, "guest_note");
  const leavesAt = field(formData, "leaves_at");
  const allergy = field(formData, "allergy");
  const specialRequest = field(formData, "special_request");
  const saladNote = field(formData, "salad_note");
  const deliveryFee = moneyField(field(formData, "delivery_fee") || "0");
  const trayDeposit = moneyField(field(formData, "tray_deposit") || "0");
  const trayReturn = moneyField(field(formData, "tray_return") || "0");
  const isQuote = formData.get("is_quote") === "1";
  const amount = moneyField(field(formData, "amount"));
  const paid = moneyField(field(formData, "paid") || "0");
  const method = field(formData, "payment_method");
  let shopifyUrl = "";
  const dishIds = formData.getAll("item_dish_id").map((value) => String(value));
  const quantities = formData
    .getAll("item_quantity")
    .map((value) => Number(String(value)));

  if (!customerName || key.length < 7) {
    return { error: "צריך שם וטלפון" };
  }
  if (!when || Number.isNaN(Date.parse(fromDubaiInput(when)))) {
    return { error: "צריך תאריך ושעה" };
  }
  if (!isOrderKind(orderKind) || !isFulfillment(fulfillment)) {
    return { error: "חסר סוג או אופן אספקה" };
  }
  if (needsDestination(fulfillment) && !destination) {
    return { error: "צריך יעד" };
  }
  if (!allergy) return { error: "צריך אלרגיה, או לסמן שאין" };
  if (method !== "card" && method !== "cash")
    return { error: "צריך אופן תשלום" };
  const typedLink = field(formData, "payment_url");
  const manualLink = method === "card" && typedLink ? paymentLink(typedLink) : null;
  if (typedLink && method === "card" && !manualLink)
    return { error: "קישור התשלום לא תקין. צריך קישור Stripe שמתחיל ב-https://", needsLink: true };
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(paid) ||
    paid < 0
  ) {
    return { error: "הסכום לא תקין" };
  }
  if (
    !Number.isFinite(deliveryFee) ||
    deliveryFee < 0 ||
    !Number.isFinite(trayDeposit) ||
    trayDeposit < 0 ||
    !Number.isFinite(trayReturn) ||
    trayReturn < 0
  ) {
    return { error: "משלוח או פיקדון לא תקינים" };
  }
  if (leavesAt.length > 20) return { error: "שעת היציאה ארוכה מדי" };
  const packInputs = formData.getAll("pack").map((value) => {
    try {
      return JSON.parse(String(value)) as unknown;
    } catch {
      return null;
    }
  });
  if (packInputs.length > 20) return { error: "יותר מדי חבילות בהזמנה אחת" };
  if (
    (dishIds.length === 0 && packInputs.length === 0) ||
    dishIds.some(
      (dishId, index) =>
        !dishId ||
        !Number.isInteger(quantities[index]) ||
        quantities[index] < 1,
    )
  ) {
    return { error: "צריך לבחור מנות מהתפריט" };
  }

  const guestCount = guests ? Number(guests) : null;
  if (guests && (!Number.isInteger(guestCount) || (guestCount ?? 0) < 1)) {
    return { error: "מספר הסועדים לא תקין" };
  }

  const handledBy = field(formData, "handled_by");
  if (!isHandler(handledBy)) return { error: "צריך לבחור מי טיפל בהזמנה" };

  const currency = field(formData, "currency") || "AED";
  if (!isCurrency(currency)) return { error: "המטבע לא תקין" };
  const currencyRate = currency === "AED" ? 1 : moneyField(field(formData, "currency_rate"));
  if (!validRate(currencyRate)) return { error: "שער המטבע לא תקין" };
  const amountForeign = currency === "AED" ? null : foreignTotal(amount, currencyRate);
  const total = amountForeign === null ? amount : aedValue(amountForeign, currencyRate);

  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      { phone_key: key, phone, full_name: customerName },
      { onConflict: "phone_key" },
    )
    .select("id")
    .single();
  if (customerError || !customer) return { error: "הלקוח לא נשמר" };

  let status: OrderStatus = "draft";
  let ending: string | null = null;
  let source = "manual";
  if (id) {
    const { data: existing } = await supabase
      .from("orders")
      .select("status, ending, shopify_url, source, amount, currency")
      .eq("id", id)
      .maybeSingle();
    if (existing && isStatus(existing.status)) {
      status = existing.status;
      ending = existing.ending;
      if (isSource(existing.source)) source = existing.source;
      // A Stripe Checkout link is fixed to the amount and currency it was created for.
      if (Number(existing.amount) === total && existing.currency === currency)
        shopifyUrl = existing.shopify_url ?? "";
    }
  }
  if (manualLink) shopifyUrl = manualLink;

  const rules = await loadPackages();
  const built = buildPackLines(packInputs, rules);
  if ("error" in built) return { error: built.error };
  if (dishIds.some((dishId) => rules.some((rule) => rule.id === dishId)))
    return { error: "חבילה צריך לבנות דרך בחירת המנות שלה" };

  const { data: catalog } = dishIds.length
    ? await supabase.from("dishes").select("id, name, price").in("id", dishIds)
    : { data: [] };
  const byId = new Map((catalog ?? []).map((dish) => [dish.id, dish]));
  const items = dishIds.map((dishId, index) => {
    const dish = byId.get(dishId);
    if (!dish) return null;
    return {
      dish_id: dishId as string | null,
      name: dish.name,
      quantity: quantities[index],
      unit_price: Number(dish.price),
    };
  });
  const dishLines = items.flatMap((item) => (item ? [item] : []));
  if (dishLines.length !== dishIds.length) return { error: "מנה לא נמצאה בתפריט" };
  const lines = [...built.lines, ...dishLines].map((line, position) => ({ ...line, position }));

  const progressed =
    status === "in_kitchen" ||
    status === "out" ||
    status === "feedback_sent" ||
    status === "paid_shopify";
  if (!progressed && method === "card" && !shopifyUrl.startsWith("https://") && !stripeReady())
    return { error: "צריך להדביק קישור תשלום של Stripe", needsLink: true };
  if (!progressed && method === "cash") {
    status = "cash_agreed";
    ending = "cash";
  }
  if (!progressed && method === "card") {
    status = "link_sent";
    ending = "shopify_link";
  }

  const row = {
    customer_id: customer.id,
    customer_name: customerName,
    phone,
    phone_key: key,
    scheduled_at: fromDubaiInput(when),
    order_kind: orderKind,
    fulfillment,
    destination,
    guest_count: guestCount,
    guest_note: guestNote,
    leaves_at: leavesAt,
    allergy,
    special_request: specialRequest,
    delivery_fee: deliveryFee,
    tray_deposit: trayDeposit,
    tray_return: trayReturn,
    salad_note: saladNote,
    is_quote: isQuote,
    source,
    ending,
    status,
    amount: total,
    paid,
    currency,
    currency_rate: currencyRate,
    amount_foreign: amountForeign,
    handled_by: handledBy,
    shopify_url: shopifyUrl,
  };

  let orderId = id;
  if (id) {
    const { error } = await supabase.from("orders").update(row).eq("id", id);
    if (error) return { error: "ההזמנה לא נשמרה" };
    await supabase.from("order_items").delete().eq("order_id", id);
  } else {
    const { data, error } = await supabase
      .from("orders")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) return { error: "ההזמנה לא נשמרה" };
    orderId = data.id;
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(lines.map((item) => ({ ...item, order_id: orderId })));
  if (itemsError) return { error: "המנות לא נשמרו" };

  await done("ההזמנה נשמרה ✓");
  if (!progressed) {
    const sent = await issueGuestLink(orderId, field(formData, "origin"));
    if ("error" in sent) return { error: sent.error, id: orderId };
    return { id: orderId, phone: sent.phone, message: sent.message };
  }
  return { id: orderId };
}

export async function setOrderStatus(formData: FormData) {
  const profile = await getProfile();
  const id = field(formData, "id");
  const status = field(formData, "status");
  if (!id || !isStatus(status)) return;
  if (!canOperate(profile?.role) && profile?.role !== "kitchen") return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("orders")
    .select("status, amount, order_kind")
    .eq("id", id)
    .maybeSingle();
  if (!existing || !isStatus(existing.status)) return;
  const allowed = nextSteps(existing.status).some(
    (step) => step.status === status,
  );
  if (!allowed) return;
  if (profile.role === "kitchen" && status !== "out") return;
  if (
    profile.role === "kitchen" &&
    existing.status !== "in_kitchen" &&
    existing.status !== "paid_shopify"
  ) {
    return;
  }
  if (
    existing.order_kind === "group_event" &&
    status === "paid_shopify" &&
    !canOperate(profile?.role)
  )
    return;

  await supabase
    .from("orders")
    .update(stepPatch(status, Number(existing.amount)))
    .eq("id", id);

  await done("השלב עודכן ✓");
}

export async function issueGuestLink(
  orderId: string,
  origin: string,
): Promise<{ error: string } | { phone: string; message: string }> {
  if (!(await owner())) return { error: "אין לך הרשאה לשלוח ללקוח" };
  if (!/^https?:\/\/[^/]+$/i.test(origin)) return { error: "הכתובת לא תקינה" };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, customer_name, phone, share_token, status, ending, amount, currency, amount_foreign, scheduled_at, shopify_url, destination, guest_count, guest_note, leaves_at, is_quote, delivery_fee, tray_deposit, tray_return, salad_note",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "ההזמנה לא נמצאה" };

  let token = String(order.share_token ?? "");
  if (token.length < 8) token = shortToken();
  const cash = order.ending === "cash";
  const host = customerOrigin(origin);
  const payment = cash
    ? ""
    : String(order.shopify_url ?? "").startsWith("https://")
      ? String(order.shopify_url)
      : await stripeCheckout({
          orderId: order.id,
          ...(order.currency !== "AED" && order.amount_foreign !== null
            ? { amount: Number(order.amount_foreign), currency: order.currency }
            : { amount: Number(order.amount) }),
          name: order.customer_name,
          successUrl: `${host}/o/${token}`,
        });
  const { error } = await supabase
    .from("orders")
    .update({
      share_token: token,
      ...(payment.startsWith("https://") ? { shopify_url: payment } : {}),
      ...(!cash && (order.status === "draft" || order.status === "awaiting")
        ? { status: "link_sent", ending: "shopify_link" }
        : {}),
    })
    .eq("id", orderId);
  if (error) return { error: "הקישור לא נפתח" };

  const { data: items } = await supabase
    .from("order_items")
    .select("name, quantity, unit_price, position")
    .eq("order_id", orderId)
    .order("position", { ascending: true });
  const url = `${host}/o/${token}`;
  const message = customerMessage(
    {
      customer_name: order.customer_name,
      scheduled_at: order.scheduled_at,
      destination: order.destination ?? "",
      guest_count: order.guest_count,
      guest_note: order.guest_note ?? "",
      leaves_at: order.leaves_at ?? "",
      is_quote: Boolean(order.is_quote),
      amount: Number(order.amount),
      delivery_fee: Number(order.delivery_fee ?? 0),
      tray_deposit: Number(order.tray_deposit ?? 0),
      tray_return: Number(order.tray_return ?? 0),
      salad_note: order.salad_note ?? "",
      items: (items ?? []).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
    },
    url,
    cash ? "cash" : "card",
    guestLang(String(order.phone)),
  );

  revalidatePath("/", "layout");
  return { phone: String(order.phone), message };
}

const tokenAlphabet =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function shortToken() {
  return Array.from(
    { length: 10 },
    () => tokenAlphabet[randomInt(tokenAlphabet.length)],
  ).join("");
}

function customerOrigin(origin: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (/^https:\/\/[^/]+$/i.test(configured)) return configured;
  try {
    const url = new URL(origin);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1")
      return origin.replace(/\/$/, "");
    const addresses = Object.values(networkInterfaces())
      .flatMap((list) => list ?? [])
      .filter((net) => {
        const family = String(net.family);
        return (
          (family === "IPv4" || family === "4") &&
          !net.internal &&
          net.address.startsWith("192.168.")
        );
      })
      .map((net) => net.address);
    const address = addresses[0];
    if (!address) return origin.replace(/\/$/, "");
    return `${url.protocol}//${address}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return origin;
  }
}

export async function deleteOrder(formData: FormData) {
  if (!(await owner())) return;
  const id = field(formData, "id");
  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", id);
  await done("ההזמנה נמחקה ✓");
  redirect("/orders");
}

export async function sendOut(id: string) {
  const profile = await getProfile();
  if (!id || (!canOperate(profile?.role) && profile?.role !== "kitchen"))
    return { error: "אין הרשאה" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "out" })
    .eq("id", id)
    .in("status", ["in_kitchen", "paid_shopify"])
    .select("id");
  if (error || !data?.length) return { error: "ההזמנה לא במטבח" };
  await done("סומן שיצא ✓");
  return {};
}

export async function undoOut(id: string) {
  const profile = await getProfile();
  if (!id || (!canOperate(profile?.role) && profile?.role !== "kitchen"))
    return { error: "אין הרשאה" };
  const supabase = await createClient();
  const { data } = await supabase.rpc("undo_order_out", { target: id });
  if (!(data as { ok?: boolean } | null)?.ok)
    return { error: "עבר הזמן לביטול" };
  await done("היציאה בוטלה ✓");
  return {};
}

export async function markPaid(id: string) {
  if (!(await owner()) || !id) return { error: "אין הרשאה" };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("orders")
    .select("amount")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "ההזמנה לא נמצאה" };
  const { error } = await supabase
    .from("orders")
    .update({ paid: Number(existing.amount) })
    .eq("id", id);
  if (error) return { error: "התשלום לא נשמר" };
  await done("סומן כשולם ✓");
  return {};
}

export async function removeOrder(id: string) {
  if (!(await owner()) || !id) return { error: "אין הרשאה" };
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return { error: "ההזמנה לא נמחקה" };
  await done("ההזמנה נמחקה ✓");
  return {};
}

export async function markFeedback(formData: FormData) {
  if (!(await owner())) return;
  const id = field(formData, "id");
  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ status: "feedback_sent" })
    .eq("id", id)
    .eq("status", "out");
  await done("נשמר ✓");
}
