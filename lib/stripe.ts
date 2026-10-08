export function stripeReady() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function stripeCheckout(input: {
  orderId: string;
  amount: number;
  currency?: string;
  name: string;
  successUrl: string;
  cancelUrl?: string;
  email?: string;
  locale?: "en" | "he";
}) {
  const key = process.env.STRIPE_SECRET_KEY;
  const fils = Math.round(input.amount * 100);
  const currency = /^[A-Z]{3}$/.test(input.currency ?? "") ? input.currency!.toLowerCase() : "aed";
  if (!key || fils < 1) return "";
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl ?? input.successUrl);
  body.set("client_reference_id", input.orderId);
  body.set("metadata[order_id]", input.orderId);
  body.set("payment_intent_data[metadata][order_id]", input.orderId);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", currency);
  body.set("line_items[0][price_data][unit_amount]", String(fils));
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Duba Kosher · #${input.orderId.slice(0, 6).toUpperCase()} · ${input.name}`.slice(0, 120),
  );
  if (input.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) body.set("customer_email", input.email);
  if (input.locale) body.set("locale", input.locale === "he" ? "auto" : "en");
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
