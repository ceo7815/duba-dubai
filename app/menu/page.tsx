import Link from "next/link";
import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { listMenu } from "@/lib/menu";
import { loadPackages } from "@/lib/package-rules";
import { requireProfile } from "@/lib/profile";
import { adminProducts } from "./data";
import { MenuList } from "./menu-list";
import { PackagesEditor } from "./packages-editor";
import { canOperate } from "@/lib/roles";

export default async function MenuPage() {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");
  const [products, packages, dishes] = await Promise.all([adminProducts(), loadPackages(), listMenu()]);

  return (
    <Work title="תפריט" role={profile.role}>
      <p className="text-sm leading-6 text-muted">
        כל שינוי כאן מתעדכן מיד בחנות ובמערכת: מחיר, תיאור, תמונה, מלאי.
      </p>
      <Link href="/menu/new" className="button flex items-center justify-center">
        + מוצר חדש
      </Link>
      <MenuList products={products} />
      <PackagesEditor
        packages={packages}
        candidates={dishes.map((dish) => ({
          id: dish.id,
          name: dish.name,
          price: Number(dish.price),
          image_url: dish.image_url ?? "",
          shortage: dish.shortage,
          category: dish.category,
        }))}
      />
    </Work>
  );
}
