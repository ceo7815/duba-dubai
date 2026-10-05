"use server";

import { randomBytes } from "crypto";
import { networkInterfaces } from "os";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/auth-actions";
import { fromDubaiInput } from "@/lib/dates";
import { customerMessage } from "@/lib/sheet";
import {
  isFulfillment,
  isOrderKind,
  isSource,
  isStatus,
  needsDestination,
  nextSteps,
  phoneKey,
  stepPatch,
  type OrderStatus,
} from "@/lib/domain";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function moneyField(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : Number.NaN;
}

async function owner() {
  const profile = await getProfile();
  if (profile?.role !== "owner") return null;
  return profile;
}

export async function saveOrder(
  _state: FormState,
  formData: FormData,
): Promise<{ error: string; id?: string } | { id: string; phone?: string; message?: string }> {
  if (!(await owner())) return { error: "רק הבעלים שומרת הזמנה" };

  const id = field(formData, "id");
  const customerName = field(formData, "customer_name");
  const phone = field(formData, "phone");
  const key = phoneKey(phone);
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
  let shopifyUrl = field(formData, "shopify_url");
  const dishIds = formData.getAll("item_dish_id").map((value) => String(value));
  const quantities = formData.getAll("item_quantity").map((value) => Number(String(value)));

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
  if (method !== "card" && method !== "cash") return { error: "צריך אופן תשלום" };
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(paid) || paid < 0) {
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
  if (
    dishIds.length === 0 ||
    dishIds.some((dishId, index) => !dishId || !Number.isInteger(quantities[index]) || quantities[index] < 1)
  ) {
    return { error: "צריך לבחור מנות מהתפריט" };
  }

  const guestCount = guests ? Number(guests) : null;
  if (guests && (!Number.isInteger(guestCount) || (guestCount ?? 0) < 1)) {
    return { error: "מספר הסועדים לא תקין" };
  }

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
      .select("status, ending, shopify_url, source")
      .eq("id", id)
      .maybeSingle();
    if (existing && isStatus(existing.status)) {
      status = existing.status;
      ending = existing.ending;
      if (isSource(existing.source)) source = existing.source;
      if (!shopifyUrl) shopifyUrl = existing.shopify_url ?? "";
    }
  }

  const { data: catalog } = await supabase.from("dishes").select("id, name, price").in("id", dishIds);
  const byId = new Map((catalog ?? []).map((dish) => [dish.id, dish]));
  const items = dishIds.map((dishId, index) => {
    const dish = byId.get(dishId);
    if (!dish) return null;
    return {
      dish_id: dishId,
      name: dish.name,
      quantity: quantities[index],
      unit_price: Number(dish.price),
      position: index,
    };
  });
  const lines = items.flatMap((item) => (item ? [item] : []));
  if (lines.length !== dishIds.length) return { error: "מנה לא נמצאה בתפריט" };

  const progressed =
    status === "in_kitchen" || status === "out" || status === "feedback_sent" || status === "paid_shopify";
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
    amount,
    paid,
    shopify_url: shopifyUrl,
  };

  let orderId = id;
  if (id) {
    const { error } = await supabase.from("orders").update(row).eq("id", id);
    if (error) return { error: "ההזמנה לא נשמרה" };
    await supabase.from("order_items").delete().eq("order_id", id);
  } else {
    const { data, error } = await supabase.from("orders").insert(row).select("id").single();
    if (error || !data) return { error: "ההזמנה לא נשמרה" };
    orderId = data.id;
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((item) => ({ ...item, order_id: orderId })),
  );
  if (itemsError) return { error: "המנות לא נשמרו" };

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/board");
  revalidatePath("/customers");
  revalidatePath("/morning");
  revalidatePath("/today");
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
  const paymentUrl = field(formData, "payment_url");
  if (!id || !isStatus(status)) return;
  if (profile?.role !== "owner" && profile?.role !== "kitchen") return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("orders")
    .select("status, amount, order_kind, source")
    .eq("id", id)
    .maybeSingle();
  if (!existing || !isStatus(existing.status)) return;
  const allowed = nextSteps(existing.status, existing.source).some((step) => step.status === status);
  if (!allowed) return;
  if (profile.role === "kitchen" && status !== "out") return;
  if (
    profile.role === "kitchen" &&
    existing.status !== "in_kitchen" &&
    existing.status !== "paid_shopify"
  ) {
    return;
  }
  if (existing.order_kind === "group_event" && status === "paid_shopify" && profile.role !== "owner") return;

  const patch = {
    ...stepPatch(status, Number(existing.amount)),
    ...(paymentUrl ? { shopify_url: paymentUrl } : {}),
  };
  await supabase.from("orders").update(patch).eq("id", id);

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/morning");
  revalidatePath("/board");
  revalidatePath("/today");
  revalidatePath("/expected");
}

export async function issueGuestLink(
  orderId: string,
  origin: string,
  paymentUrl = "",
): Promise<{ error: string } | { phone: string; message: string }> {
  if (!(await owner())) return { error: "רק הבעלים שולחת ללקוח" };
  if (!/^https?:\/\/[^/]+$/i.test(origin)) return { error: "הכתובת לא תקינה" };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, customer_name, phone, share_token, status, ending, amount, scheduled_at, shopify_url, destination, guest_count, guest_note, leaves_at, is_quote, delivery_fee, tray_deposit, tray_return, salad_note",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "ההזמנה לא נמצאה" };

  let token = String(order.share_token ?? "");
  if (token.length < 20) {
    token = randomBytes(24).toString("base64url");
  }
  const cash = order.ending === "cash";
  const host = customerOrigin(origin);
  const payment = cash
    ? ""
    : paymentUrl.startsWith("https://")
      ? paymentUrl
      : String(order.shopify_url ?? "").startsWith("https://")
        ? String(order.shopify_url)
        : await stripeCheckout(order.id, Number(order.amount), order.customer_name, `${host}/o/${token}`);
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
  );

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/today");
  return { phone: String(order.phone), message };
}

function customerOrigin(origin: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (/^https:\/\/[^/]+$/i.test(configured)) return configured;
  try {
    const url = new URL(origin);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return origin.replace(/\/$/, "");
    const addresses = Object.values(networkInterfaces())
      .flatMap((list) => list ?? [])
      .filter((net) => {
        const family = String(net.family);
        return (family === "IPv4" || family === "4") && !net.internal && net.address.startsWith("192.168.");
      })
      .map((net) => net.address);
    const address = addresses[0];
    if (!address) return origin.replace(/\/$/, "");
    return `${url.protocol}//${address}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return origin;
  }
}

async function stripeCheckout(orderId: string, amount: number, name: string, successUrl: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  const fils = Math.round(amount * 100);
  if (!key || fils < 1) return "";
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", successUrl);
  body.set("cancel_url", successUrl);
  body.set("client_reference_id", orderId);
  body.set("metadata[order_id]", orderId);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "aed");
  body.set("line_items[0][price_data][unit_amount]", String(fils));
  body.set("line_items[0][price_data][product_data][name]", `דובה · ${name}`.slice(0, 120));
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) return "";
  const json = (await response.json()) as { url?: string };
  return json.url ?? "";
}

export async function deleteOrder(formData: FormData) {
  if (!(await owner())) return;
  const id = field(formData, "id");
  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/orders");
  redirect("/orders");
}

export async function markFeedback(formData: FormData) {
  if (!(await owner())) return;
  const id = field(formData, "id");
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "feedback_sent" }).eq("id", id).eq("status", "out");
  revalidatePath("/");
  revalidatePath("/morning");
  revalidatePath(`/orders/${id}`);
}
