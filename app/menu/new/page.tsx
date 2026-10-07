import { redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { ProductForm } from "../product-form";
import { canOperate } from "@/lib/roles";

export default async function NewMenuProductPage() {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");

  return (
    <Work title="מוצר חדש" backHref="/menu" role={profile.role}>
      <ProductForm
        initial={{
          handle: "",
          isNew: true,
          title_en: "",
          title_he: "",
          body_en: "",
          body_he: "",
          images: [],
          collections: [],
          price_option: "",
          active: true,
          rows: [{ id: "", kept: "", label_he: "", price: "", compare: "", cost: "", grams: "", shortage: false }],
        }}
      />
    </Work>
  );
}
