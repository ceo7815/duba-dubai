import { notFound, redirect } from "next/navigation";
import { OrderForm } from "@/app/orders/order-form";
import { Work } from "@/app/shell";
import { toDubaiInput } from "@/lib/dates";
import { listMenu } from "@/lib/menu";
import { getOrder } from "@/lib/orders";
import { requireProfile } from "@/lib/profile";
import { canOperate } from "@/lib/roles";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");

  const { id } = await params;
  const found = await getOrder(id);
  if (!found) notFound();

  return (
    <Work title="עריכת הזמנה" backHref={`/orders/${id}`} role={profile.role}>
      <OrderForm
        order={{
          ...found.order,
          scheduled_at: toDubaiInput(found.order.scheduled_at),
          amount: Number(found.order.amount),
          paid: Number(found.order.paid),
          delivery_fee: Number(found.order.delivery_fee),
          tray_deposit: Number(found.order.tray_deposit),
          tray_return: Number(found.order.tray_return),
        }}
        dishes={await listMenu()}
        items={found.items.map((item) => ({
          ...item,
          unit_price: Number(item.unit_price),
        }))}
      />
    </Work>
  );
}
