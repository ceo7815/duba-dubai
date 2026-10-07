import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { dubaiKey } from "@/lib/dates";
import { orderHaystack } from "@/lib/order-search";
import { itemsByOrder, listOrders } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { BoardView } from "./board-view";
import { canOperate } from "@/lib/roles";

export default async function BoardPage() {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");

  const orders = await listOrders();
  const items = await itemsByOrder(orders.map((order) => order.id));
  const entries = orders.map((order) => {
    const day = dubaiKey(new Date(order.scheduled_at));
    const names = (items.get(order.id) ?? []).map((item) => item.name);
    return { order, day, haystack: orderHaystack(order, names, day) };
  });

  return (
    <Work title="לוח" role={profile.role}>
      <BoardView entries={entries} today={dubaiKey()} />
    </Work>
  );
}
