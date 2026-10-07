import { notFound, redirect } from "next/navigation";
import { Work } from "@/app/shell";
import { requireProfile } from "@/lib/profile";
import { adminProduct } from "../data";
import { ProductForm } from "../product-form";
import type { ProductInput } from "../types";
import { canOperate } from "@/lib/roles";

const amount = (value: number | null) => (value === null || value === 0 ? "" : String(value));

export default async function MenuProductPage({ params }: PageProps<"/menu/[handle]">) {
  const profile = await requireProfile();
  if (!canOperate(profile?.role)) redirect("/login");
  const { handle } = await params;
  const product = await adminProduct(handle);
  if (!product) notFound();

  const initial: ProductInput = {
    handle: product.handle,
    isNew: false,
    title_en: product.title_en,
    title_he: product.title_he,
    body_en: product.body_en,
    body_he: product.body_he,
    images: product.images,
    collections: product.collections,
    price_option: product.price_option,
    active: product.active,
    rows: product.rows.map((row) => ({
      id: row.id,
      kept: row.variant_title,
      label_he: row.label_he,
      price: String(row.price),
      compare: amount(row.compare),
      cost: amount(row.cost),
      grams: amount(row.grams),
      shortage: row.shortage,
    })),
  };

  return (
    <Work title={product.title_he} backHref="/menu" role={profile.role}>
      <a href={`/shop/products/${product.handle}`} target="_blank" className="text-sm font-bold underline">
        לראות בחנות
      </a>
      <ProductForm key={product.rows.map((row) => row.id).join()} initial={initial} />
    </Work>
  );
}
