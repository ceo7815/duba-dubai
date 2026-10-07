import type { OrderStatus } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export type OrderItem = {
  id: string;
  dish_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  position: number;
  image_url: string;
};

export type OrderRow = {
  id: string;
  customer_name: string;
  phone: string;
  phone_key: string;
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
  source: string;
  ending: string | null;
  status: OrderStatus;
  amount: number;
  paid: number;
  shopify_url: string;
  created_at: string;
};

const orderColumns =
  "id, customer_name, phone, phone_key, scheduled_at, order_kind, fulfillment, destination, guest_count, guest_note, leaves_at, allergy, special_request, delivery_fee, tray_deposit, tray_return, salad_note, is_quote, source, ending, status, amount, paid, shopify_url, created_at";

export async function listOrders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .order("scheduled_at", { ascending: true });
  return (data ?? []) as OrderRow[];
}

export type ShortItem = { name: string; quantity: number };

export async function itemsByOrder(ids: string[]) {
  const map = new Map<string, ShortItem[]>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_items")
    .select("order_id, name, quantity, position")
    .in("order_id", ids)
    .order("position", { ascending: true });
  for (const row of data ?? []) {
    const list = map.get(row.order_id) ?? [];
    list.push({ name: row.name, quantity: Number(row.quantity) });
    map.set(row.order_id, list);
  }
  return map;
}

export async function getOrder(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(orderColumns)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const items = await fullItemsByOrder([id]);
  return { order: data as OrderRow, items: items.get(id) ?? [] };
}

export async function fullItemsByOrder(ids: string[]) {
  const map = new Map<string, OrderItem[]>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_items")
    .select("id, order_id, dish_id, name, quantity, unit_price, position, dishes(image_url)")
    .in("order_id", ids)
    .order("position", { ascending: true });
  for (const item of data ?? []) {
    const row = item as typeof item & { dishes?: { image_url: string } | { image_url: string }[] | null };
    const linked = Array.isArray(row.dishes) ? row.dishes[0] : row.dishes;
    const list = map.get(row.order_id) ?? [];
    list.push({
      id: row.id,
      dish_id: row.dish_id,
      name: row.name,
      quantity: row.quantity,
      unit_price: row.unit_price,
      position: row.position,
      image_url: linked?.image_url ?? "",
    });
    map.set(row.order_id, list);
  }
  return map;
}
