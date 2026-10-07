export const orderKinds = [
  "shabbat_couple",
  "shabbat_family",
  "regular",
  "hotel",
  "yacht",
  "hotel_five",
  "hosting",
  "pickup",
  "group_event",
  "holiday",
] as const;

export type OrderKind = (typeof orderKinds)[number];

export const orderKindLabels: Record<OrderKind, string> = {
  shabbat_couple: "שבת זוגי",
  shabbat_family: "שבת משפחתי",
  regular: "לקוח קבוע",
  hotel: "משלוח למלון",
  yacht: "יאכטה",
  hotel_five: "מלון פייב",
  hosting: "אירוח אצלנו",
  pickup: "איסוף",
  group_event: "קבוצה או אירוע",
  holiday: "חג",
};

export const fulfillments = [
  "delivery",
  "pickup",
  "hotel",
  "yacht",
  "five_kitchen",
  "hosting",
] as const;

export type Fulfillment = (typeof fulfillments)[number];

export const fulfillmentLabels: Record<Fulfillment, string> = {
  delivery: "משלוח",
  pickup: "איסוף",
  hotel: "מלון",
  yacht: "יאכטה",
  five_kitchen: "מטבח מלון פייב",
  hosting: "אירוח אצלנו",
};

export const sources = ["bot", "owner_chat", "site", "manual"] as const;

export type OrderSource = (typeof sources)[number];

export const sourceLabels: Record<OrderSource, string> = {
  bot: "בוט וואטסאפ",
  owner_chat: "שיחה שלה",
  site: "חנות האתר",
  manual: "הקלדה",
};

export const endings = ["shopify_link", "cash", "shopify_paid"] as const;

export type OrderEnding = (typeof endings)[number];

export const endingLabels: Record<OrderEnding, string> = {
  shopify_link: "כרטיס אשראי",
  cash: "מזומן",
  shopify_paid: "שולם",
};

export const statuses = [
  "draft",
  "awaiting",
  "link_sent",
  "cash_agreed",
  "paid_shopify",
  "in_kitchen",
  "out",
  "feedback_sent",
] as const;

export type OrderStatus = (typeof statuses)[number];

export const statusLabels: Record<OrderStatus, string> = {
  draft: "שיחה",
  awaiting: "אושר",
  link_sent: "ממתינה לתשלום",
  cash_agreed: "ממתינה לאישור",
  paid_shopify: "שולם",
  in_kitchen: "במטבח",
  out: "יצא",
  feedback_sent: "משוב נשלח",
};

export const stages = ["waiting", "kitchen", "out"] as const;

export type Stage = (typeof stages)[number];

export const stageLabels: Record<Stage, string> = {
  waiting: "ממתין לאישור",
  kitchen: "במטבח",
  out: "יצא ללקוח",
};

export function stageOf(status: OrderStatus): Stage {
  if (status === "paid_shopify" || status === "in_kitchen") return "kitchen";
  if (status === "out" || status === "feedback_sent") return "out";
  return "waiting";
}

export function isStage(value: string): value is Stage {
  return (stages as readonly string[]).includes(value);
}

export const pathLabels: Record<OrderStatus, string> = {
  draft: "שיחה",
  awaiting: "אושר",
  link_sent: "קישור",
  cash_agreed: "לאישור",
  paid_shopify: "שולם",
  in_kitchen: "מטבח",
  out: "יצא",
  feedback_sent: "משוב",
};

export function isOrderKind(value: string): value is OrderKind {
  return (orderKinds as readonly string[]).includes(value);
}

export function isFulfillment(value: string): value is Fulfillment {
  return (fulfillments as readonly string[]).includes(value);
}

export function isSource(value: string): value is OrderSource {
  return (sources as readonly string[]).includes(value);
}

export function isEnding(value: string): value is OrderEnding {
  return (endings as readonly string[]).includes(value);
}

export function isStatus(value: string): value is OrderStatus {
  return (statuses as readonly string[]).includes(value);
}

export function phoneKey(phone: string) {
  return phone.replace(/\D/g, "");
}

export function needsDestination(fulfillment: Fulfillment) {
  return fulfillment !== "pickup" && fulfillment !== "hosting";
}

export function statusForEnding(ending: OrderEnding | null): OrderStatus {
  if (ending === "shopify_link") return "link_sent";
  if (ending === "cash") return "cash_agreed";
  if (ending === "shopify_paid") return "paid_shopify";
  return "awaiting";
}

const mainPath: OrderStatus[] = [
  "draft",
  "awaiting",
  "link_sent",
  "paid_shopify",
  "in_kitchen",
  "out",
  "feedback_sent",
];

const cashPath: OrderStatus[] = [
  "draft",
  "awaiting",
  "cash_agreed",
  "in_kitchen",
  "out",
  "feedback_sent",
];

const sitePath: OrderStatus[] = ["link_sent", "paid_shopify", "in_kitchen", "out", "feedback_sent"];

export function pathFor(status: OrderStatus, source: string, ending: string | null) {
  if (source === "site") return sitePath;
  if (ending === "cash" || status === "cash_agreed") return cashPath;
  return mainPath;
}

export function nextSteps(status: OrderStatus) {
  if (status === "draft") return [{ status: "awaiting" as const, label: "אושר בוואטסאפ" }];
  if (status === "awaiting") {
    return [
      { status: "link_sent" as const, label: "קישור לתשלום נשלח" },
      { status: "cash_agreed" as const, label: "מזומן לאישור הלקוח" },
    ];
  }
  if (status === "link_sent") return [{ status: "paid_shopify" as const, label: "התשלום נכנס למטבח" }];
  if (status === "paid_shopify") {
    return [{ status: "in_kitchen" as const, label: "למטבח" }];
  }
  if (status === "in_kitchen") return [{ status: "out" as const, label: "יצא" }];
  if (status === "out") return [{ status: "feedback_sent" as const, label: "משוב נשלח" }];
  return [];
}

export function stepPatch(status: OrderStatus, amount: number) {
  if (status === "awaiting") return { status, ending: null };
  if (status === "link_sent") return { status, ending: "shopify_link" as const };
  if (status === "cash_agreed") return { status: "cash_agreed" as const, ending: "cash" as const };
  if (status === "paid_shopify") return { status: "in_kitchen" as const, ending: "shopify_paid" as const, paid: amount };
  return { status };
}

export function money(value: number) {
  const amount = new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `\u200E${amount} AED`;
}
