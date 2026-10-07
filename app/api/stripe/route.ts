import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { intakeReady, markStripePaid } from "@/lib/intake";

const toleranceSeconds = 300;

function validSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1] ?? "";
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type CheckoutEvent = {
  type?: string;
  data?: {
    object?: {
      payment_status?: string;
      client_reference_id?: string | null;
      metadata?: { order_id?: string } | null;
    };
  };
};

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!intakeReady("STRIPE_WEBHOOK_SECRET")) {
    return Response.json({ connected: false, message: "סטרייפ עדיין לא מחובר." }, { status: 503 });
  }

  const payload = await request.text();
  if (!validSignature(payload, request.headers.get("stripe-signature") ?? "", secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const event = JSON.parse(payload) as CheckoutEvent;
  const session = event.data?.object;
  const paidEvent =
    event.type === "checkout.session.async_payment_succeeded" ||
    (event.type === "checkout.session.completed" && session?.payment_status === "paid");
  if (!paidEvent) return Response.json({ received: true });

  const orderId = session?.metadata?.order_id || session?.client_reference_id || "";
  const result = await markStripePaid(orderId);
  if (result.ok) {
    revalidatePath("/", "layout");
  }
  // Stripe retries anything that is not 2xx, so a known non-payable order still returns 200.
  return Response.json(result, { status: result.ok || result.status === 409 ? 200 : result.status });
}
