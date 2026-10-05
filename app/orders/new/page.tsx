import { redirect } from "next/navigation";
import { OrderForm } from "@/app/orders/order-form";
import { Work } from "@/app/shell";
import { listMenu } from "@/lib/menu";
import { requireProfile } from "@/lib/profile";

export default async function NewOrderPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  return (
    <Work title="הזמנה חדשה" backHref="/orders" role={profile.role}>
      <OrderForm dishes={await listMenu()} />
    </Work>
  );
}
