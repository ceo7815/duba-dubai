import { money } from "@/lib/domain";

export type SheetItem = { name: string; quantity: number; unit_price: number };

export type SheetOrder = {
  customer_name: string;
  scheduled_at: string;
  destination: string;
  guest_count: number | null;
  guest_note: string;
  leaves_at: string;
  is_quote: boolean;
  amount: number;
  delivery_fee: number;
  tray_deposit: number;
  tray_return: number;
  salad_note: string;
  items: SheetItem[];
};

export function lineTotal(item: SheetItem) {
  return Number(item.quantity) * Number(item.unit_price);
}

export function foodTotal(items: SheetItem[]) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function lineLabel(item: SheetItem) {
  const qty = Number(item.quantity);
  const price = Number(item.unit_price);
  if (qty <= 1) return `${item.name} = ${money(lineTotal(item))}`;
  return `${qty} ${item.name} × ${price} = ${money(lineTotal(item))}`;
}

export function customerMessage(order: SheetOrder, url: string, pay: "card" | "cash", lang: "he" | "en" = "he") {
  if (lang === "en") {
    const line = order.is_quote
      ? "Here is your quote from Duba Dubai Kosher Catering."
      : pay === "card"
        ? "Here is your order. Please confirm and pay securely by card at the link."
        : "Here is your order. Please confirm at the link. Payment is in cash on delivery.";
    return `Hi ${order.customer_name},\n\nThank you for choosing Duba Dubai Kosher Catering.\n${line}\n\n${url}`;
  }
  const attached = order.is_quote
    ? "מצורפת הצעת המחיר מקייטרינג דובה דובאי."
    : pay === "card"
      ? "מצורפת ההזמנה. נא לאשר בקישור, ושם אפשר גם לשלם בכרטיס."
      : "מצורפת ההזמנה. נא לאשר בקישור. התשלום במזומן במסירה.";
  return `שלום ${order.customer_name},\n\nתודה שבחרתם בקייטרינג דובה דובאי.\n${attached}\n\n${url}`;
}
