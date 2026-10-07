import { formatDay } from "@/lib/dates";
import {
  endingLabels,
  fulfillmentLabels,
  orderKindLabels,
  sourceLabels,
  stageLabels,
  stageOf,
  statusLabels,
} from "@/lib/domain";
import type { OrderRow } from "@/lib/orders";

const finals: Record<string, string> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7\u0300-\u036f]/g, "")
    .replace(/[ךםןףץ]/g, (letter) => finals[letter])
    .replace(/["'`׳״\-_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phoneForms(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];
  const local = digits.replace(/^(00)?971/, "").replace(/^0+/, "");
  return [digits, local, `0${local}`, `971${local}`];
}

export function orderHaystack(
  order: OrderRow,
  itemNames: string[],
  day: string,
) {
  const [year, month, date] = day.split("-");
  const label = <T extends string>(
    labels: Record<T, string>,
    key: string | null,
  ) => (key && key in labels ? labels[key as T] : "");
  const text = normalize(
    [
      order.customer_name,
      order.phone,
      order.destination,
      order.guest_note,
      order.guest_count ? `${order.guest_count} נפשות` : "",
      order.leaves_at,
      order.allergy,
      order.special_request,
      order.salad_note,
      order.is_quote ? "הצעת מחיר" : "",
      label(orderKindLabels, order.order_kind),
      label(fulfillmentLabels, order.fulfillment),
      label(sourceLabels, order.source),
      label(endingLabels, order.ending),
      statusLabels[order.status],
      stageLabels[stageOf(order.status)],
      formatDay(day),
      `${Number(date)}.${Number(month)} ${Number(date)}/${Number(month)} ${date}.${month}.${year}`,
      String(Number(order.amount)),
      order.id.slice(0, 8),
      ...itemNames,
    ].join(" "),
  );
  return { text, phones: phoneForms(order.phone) };
}

export type Haystack = ReturnType<typeof orderHaystack>;

export function matchesQuery(haystack: Haystack, query: string) {
  const words = normalize(query).split(" ").filter(Boolean);
  return words.every((word) => {
    if (haystack.text.includes(word)) return true;
    const digits = word.replace(/\D/g, "");
    if (
      digits.length < 3 ||
      digits.length !== word.replace(/[\s+]/g, "").length
    )
      return false;
    const local = digits.replace(/^(00)?971/, "").replace(/^0+/, "");
    return haystack.phones.some(
      (phone) =>
        phone.includes(digits) || (local.length >= 3 && phone.includes(local)),
    );
  });
}
