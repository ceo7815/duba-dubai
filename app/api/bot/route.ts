import { revalidatePath } from "next/cache";
import { intakeReady, writeBotOrder } from "@/lib/intake";

export async function POST(request: Request) {
  if (!intakeReady("WHATSAPP_BOT_TOKEN")) {
    return Response.json(
      { connected: false, waiting: "whatsapp", message: "בוט הוואטסאפ עדיין לא מחובר. אותה הזמנה זזה מהכפתורים במסך ההזמנה." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.WHATSAPP_BOT_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await writeBotOrder(await request.json());
  if (result.ok) {
    revalidatePath("/", "layout");
  }
  return Response.json(result, { status: result.status });
}
