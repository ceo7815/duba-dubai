import { revalidatePath } from "next/cache";
import { intakeReady, writeShopifyOrder } from "@/lib/intake";

export async function POST(request: Request) {
  if (!intakeReady("SHOPIFY_WEBHOOK_SECRET")) {
    return Response.json(
      { connected: false, waiting: "nevo", message: "שופיפיי עדיין לא מחובר. הזמנת אתר תיכנס לכאן כשנבו יחבר." },
      { status: 503 },
    );
  }
  if (request.headers.get("x-duba-secret") !== process.env.SHOPIFY_WEBHOOK_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await writeShopifyOrder(await request.json());
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/today");
    revalidatePath("/board");
  }
  return Response.json(result, { status: result.status });
}
