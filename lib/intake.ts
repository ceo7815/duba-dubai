import {
  isFulfillment,
  isOrderKind,
  isStatus,
  needsDestination,
  nextSteps,
  phoneKey,
  stageOf,
  stepPatch,
} from "@/lib/domain";
import { adminClient } from "@/lib/supabase/admin";

function dubaiStamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+04:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function intakeReady(secretName: "WHATSAPP_BOT_TOKEN" | "STRIPE_WEBHOOK_SECRET") {
  return Boolean(process.env[secretName] && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function itemsOf(value: unknown) {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((item, index) => {
      const row = item as { name?: unknown; quantity?: unknown; unit_price?: unknown };
      return {
        name: String(row.name ?? "").trim(),
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        position: index,
      };
    })
    .filter((item) => item.name);
  if (items.length === 0 || items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) return null;
  if (items.some((item) => !Number.isFinite(item.unit_price) || item.unit_price < 0)) return null;
  return items;
}

async function customer(phone: string, name: string) {
  const admin = adminClient();
  const key = phoneKey(phone);
  if (!admin || key.length < 7 || !name) return null;
  const { data, error } = await admin
    .from("customers")
    .upsert({ phone_key: key, phone, full_name: name }, { onConflict: "phone_key" })
    .select("id")
    .single();
  if (error || !data) return null;
  return { admin, id: data.id as string, key };
}

export async function writeBotOrder(body: {
  phone?: unknown;
  customer_name?: unknown;
  scheduled_at?: unknown;
  order_kind?: unknown;
  fulfillment?: unknown;
  destination?: unknown;
  allergy?: unknown;
  special_request?: unknown;
  amount?: unknown;
  items?: unknown;
  step?: unknown;
  payment_url?: unknown;
}) {
  const saved = await customer(String(body.phone ?? ""), String(body.customer_name ?? "").trim());
  if (!saved) return { ok: false as const, status: 400, error: "צריך שם וטלפון" };
  const when = dubaiStamp(String(body.scheduled_at ?? ""));
  const orderKind = String(body.order_kind ?? "");
  const fulfillment = String(body.fulfillment ?? "");
  const destination = String(body.destination ?? "").trim();
  const allergy = String(body.allergy ?? "").trim();
  const amount = Number(body.amount);
  const items = itemsOf(body.items);
  if (!isOrderKind(orderKind) || !isFulfillment(fulfillment) || !allergy || !items) {
    return { ok: false as const, status: 400, error: "חסרים פרטי הזמנה" };
  }
  if (needsDestination(fulfillment) && !destination) {
    return { ok: false as const, status: 400, error: "צריך יעד" };
  }
  if (!when || !Number.isFinite(amount) || amount < 0) {
    return { ok: false as const, status: 400, error: "תאריך או סכום לא תקינים" };
  }

  const { data: existing } = await saved.admin
    .from("orders")
    .select("id, status, order_kind, amount")
    .eq("phone_key", saved.key)
    .neq("status", "feedback_sent")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = {
    customer_id: saved.id,
    customer_name: String(body.customer_name).trim(),
    phone: String(body.phone),
    phone_key: saved.key,
    scheduled_at: when,
    order_kind: orderKind,
    fulfillment,
    destination,
    allergy,
    special_request: String(body.special_request ?? "").trim(),
    source: "bot" as const,
    amount,
    ...(String(body.payment_url ?? "").trim()
      ? { shopify_url: String(body.payment_url).trim() }
      : {}),
  };

  if (
    existing &&
    isStatus(existing.status) &&
    !["draft", "awaiting", "link_sent", "cash_agreed"].includes(existing.status)
  ) {
    return { ok: false as const, status: 409, error: "ההזמנה כבר במטבח" };
  }

  let orderId = existing?.id as string | undefined;
  let status = existing && isStatus(existing.status) ? existing.status : "draft";
  if (!orderId) {
    const { data, error } = await saved.admin
      .from("orders")
      .insert({ ...row, status: "draft", ending: null, paid: 0 })
      .select("id")
      .single();
    if (error || !data) return { ok: false as const, status: 500, error: "ההזמנה לא נשמרה" };
    orderId = data.id;
    status = "draft";
  } else {
    await saved.admin.from("orders").update(row).eq("id", orderId);
    await saved.admin.from("order_items").delete().eq("order_id", orderId);
  }

  const { error: itemsError } = await saved.admin
    .from("order_items")
    .insert(items.map((item) => ({ ...item, order_id: orderId })));
  if (itemsError) return { ok: false as const, status: 500, error: "המנות לא נשמרו" };

  const step = String(body.step ?? "");
  if (step) {
    if (step !== "awaiting" && step !== "link_sent" && step !== "cash_agreed") {
      return { ok: false as const, status: 409, error: "הבוט מאשר או שולח קישור. תשלום ומטבח נשארים אצלה." };
    }
    const allowed = nextSteps(status).some((item) => item.status === step);
    if (!allowed) return { ok: false as const, status: 409, error: "השלב הזה לא הבא במסלול" };
    await saved.admin.from("orders").update(stepPatch(step, amount)).eq("id", orderId);
    status = step;
  }

  return { ok: true as const, status: 200, id: orderId, orderStatus: status };
}

export async function markStripePaid(orderId: string) {
  const admin = adminClient();
  if (!admin || !orderId) return { ok: false as const, status: 400, error: "חסרה הזמנה" };
  const { data: order } = await admin
    .from("orders")
    .select("id, status, amount, order_kind")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !isStatus(order.status)) return { ok: false as const, status: 404, error: "ההזמנה לא נמצאה" };
  if (order.order_kind === "group_event") {
    return { ok: false as const, status: 409, error: "אירוע קבוצתי לא נסגר לבד" };
  }
  if (order.status === "draft") return { ok: false as const, status: 409, error: "ההזמנה עוד לא נשלחה" };
  await admin
    .from("orders")
    .update({
      paid: Number(order.amount),
      ending: "shopify_paid",
      ...(stageOf(order.status) === "waiting" ? { status: "in_kitchen" } : {}),
    })
    .eq("id", order.id);
  return { ok: true as const, status: 200, id: order.id };
}