import { revalidatePath } from "next/cache";
import { intakeReady, markStripePaid } from "@/lib/intake";

export async function POST(request: Request) {
  if (!intakeReady("STRIPE_WEBHOOK_SECRET")) {
    return Response.json(
      { connected: false, waiting: "nevo", message: "סטרייפ עדיין לא מחובר. עד אז היא מסמנת שולם על ההזמנה." },
      { status: 503 },
    );
  }
  if (request.headers.get("x-duba-secret") !== process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { order_id?: unknown };
  const result = await markStripePaid(String(body.order_id ?? ""));
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/today");
  }
  return Response.json(result, { status: result.status });
}
