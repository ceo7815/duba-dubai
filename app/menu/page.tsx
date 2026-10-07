import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { adminPackageDishes, adminProducts } from "./data";
import { MenuList, PackageDishes } from "./menu-list";
import { canOperate } from "@/lib/roles";

export default async function MenuPage() {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");
  const [products, packageDishes] = await Promise.all([adminProducts(), adminPackageDishes()]);

  return (
    <Work title="תפריט" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        כל שינוי כאן מתעדכן מיד בחנות ובמערכת: מחיר, תיאור, תמונה, מלאי.
      </p>
      <Link href="/menu/new" className="button flex items-center justify-center">
        + מוצר חדש
      </Link>
      <MenuList products={products} />
      <PackageDishes dishes={packageDishes} />
    </Work>
  );
}
