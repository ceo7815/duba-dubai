import { dubaiKey } from "@/lib/dates";
import { stageOf } from "@/lib/domain";
import { dayKey } from "@/lib/metrics";
import { listOrders } from "@/lib/orders";

export async function todayOrders(owner: boolean) {
  const today = dubaiKey();
  return (await listOrders()).filter(
    (order) =>
      order.status !== "draft" &&
      !(order.source === "site" && order.status === "link_sent") &&
      dayKey(order.scheduled_at) === today &&
      (owner || stageOf(order.status) !== "waiting"),
  );
}
