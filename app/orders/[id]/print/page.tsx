import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderSheet } from "@/app/orders/order-sheet";
import { getOrder } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { canOperate } from "@/lib/roles";

export const metadata: Metadata = { title: "הזמנה להדפסה · דובה" };

const kitchenStatuses = ["in_kitchen", "out", "feedback_sent", "paid_shopify"];

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (!canOperate(profile?.role) && profile.role !== "kitchen") redirect("/login");

  const { id } = await params;
  const found = await getOrder(id);
  if (!found) notFound();
  if (profile.role === "kitchen" && !kitchenStatuses.includes(found.order.status)) redirect("/today");

  return <OrderSheet order={found.order} items={found.items} showMoney={canOperate(profile?.role)} />;
}
