import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrderPage, PrintFrame } from "@/app/orders/order-sheet";
import { isStage, stageOf } from "@/lib/domain";
import { fullItemsByOrder } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { todayOrders } from "../orders";
import { AutoPrint } from "./auto-print";
import { canOperate } from "@/lib/roles";

export const metadata: Metadata = { title: "הזמנות היום להדפסה · דובה" };

export default async function PrintTodayPage({
  searchParams,
}: PageProps<"/today/print">) {
  const profile = await requireProfile();
  if (!canOperate(profile?.role) && profile.role !== "kitchen")
    redirect("/login");
  const owner = canOperate(profile?.role);

  const { show } = await searchParams;
  const stage = typeof show === "string" && isStage(show) ? show : null;
  const orders = (await todayOrders(owner)).filter(
    (order) => !stage || stageOf(order.status) === stage,
  );
  const items = await fullItemsByOrder(orders.map((order) => order.id));
  const back = {
    href: stage ? `/today?show=${stage}` : "/today",
    label: "חזרה להיום",
  };

  return (
    <PrintFrame back={back}>
      {orders.length === 0 ? (
        <p className="text-center text-sm font-bold">אין הזמנות להדפסה.</p>
      ) : (
        <>
          <AutoPrint />
          {orders.map((order) => (
            <OrderPage
              key={order.id}
              order={order}
              items={items.get(order.id) ?? []}
              showMoney={owner}
            />
          ))}
        </>
      )}
    </PrintFrame>
  );
}
