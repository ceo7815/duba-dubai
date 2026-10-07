"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { stripeCheckout } from "@/lib/stripe";
import { dict, isLang, optionLabel } from "@/lib/store/i18n";

export type CheckoutInput = {
  lang: string;
  name: string;
  phone: string;
  email: string;
  fulfillment: "delivery" | "pickup";
  address: string;
  allergy: string;
  notes: string;
  date: string;
  time: string;
  lines: {
    handle: string;
    variant: string;
    choice: string;
    quantity: number;
    picks?: { group: string; title: string; he: string; quantity: number }[];
  }[];
};

const groupOrder = ["salad", "starter", "main"];

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

async function origin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  if (!host) return process.env.NEXT_PUBLIC_APP_URL ?? "";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") || /^\d/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const lang = isLang(input.lang) ? input.lang : "en";
  const t = dict(lang);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  const payload = {
    name: input.name,
    phone: input.phone,
    email: input.email,
    fulfillment: input.fulfillment,
    address: input.fulfillment === "delivery" ? input.address : "",
    allergy: input.allergy,
    notes: input.notes,
    scheduled: `${input.date}T${input.time}`,
    lines: input.lines.map((line) => ({
      handle: line.handle,
      variant: line.variant,
      choice: line.choice
        .split(" / ")
        .filter(Boolean)
        .map((part) => optionLabel(part, "he"))
        .join(" / "),
      quantity: line.quantity,
      picks: line.picks
        ?.toSorted((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group))
        .map((pick) => ({ group: pick.group, title: pick.he || pick.title, quantity: pick.quantity })),
    })),
  };

  const { data, error } = await supabase.rpc("place_site_order", { payload });
  const placed = data as { id?: string; token?: string; amount?: number; error?: string } | null;
  if (error || !placed) return { ok: false, error: t.errors.fallback };
  if (placed.error || !placed.id || !placed.token) {
    return { ok: false, error: t.errors[placed.error ?? ""] ?? t.errors.fallback };
  }
  revalidatePath("/", "layout");

  const base = await origin();
  const thanks = `${base}/shop/order/${placed.token}`;
  const url = await stripeCheckout({
    orderId: placed.id,
    amount: Number(placed.amount),
    name: input.name.trim(),
    successUrl: `${thanks}?paid=1`,
    cancelUrl: thanks,
    email: input.email,
    locale: lang,
  });
  if (url) {
    await supabase.rpc("attach_site_checkout", { lookup: placed.token, url });
    return { ok: true, url };
  }
  return { ok: true, url: `/shop/order/${placed.token}` };
}
