import { createClient } from "@/lib/supabase/server";

export type AdminRow = {
  id: string;
  variant_title: string;
  label_he: string;
  price: number;
  compare: number | null;
  cost: number;
  grams: number;
  shortage: boolean;
};

export type AdminProduct = {
  handle: string;
  title_en: string;
  title_he: string;
  body_en: string;
  body_he: string;
  images: string[];
  collections: string[];
  price_option: string;
  active: boolean;
  position: number;
  rows: AdminRow[];
};

const productColumns = "handle, title_en, title_he, body_en, body_he, images, collections, price_option, active, position";
const rowColumns = "id, shopify_handle, variant_title, label_he, price, compare, cost, grams, shortage";

type DishRow = AdminRow & { shopify_handle: string };

function attach(products: Omit<AdminProduct, "rows">[], dishes: DishRow[]): AdminProduct[] {
  return products.map((product) => ({
    ...product,
    rows: dishes
      .filter((dish) => dish.shopify_handle === product.handle)
      .map((dish) => ({
        ...dish,
        price: Number(dish.price),
        compare: dish.compare === null ? null : Number(dish.compare),
        cost: Number(dish.cost),
        grams: Number(dish.grams),
      })),
  }));
}

export async function adminProducts() {
  const supabase = await createClient();
  const [products, dishes] = await Promise.all([
    supabase.from("store_products").select(productColumns).order("position"),
    supabase.from("dishes").select(rowColumns).neq("shopify_handle", "").order("position"),
  ]);
  return attach((products.data ?? []) as Omit<AdminProduct, "rows">[], (dishes.data ?? []) as DishRow[]);
}

export async function adminProduct(handle: string) {
  const supabase = await createClient();
  const [product, dishes] = await Promise.all([
    supabase.from("store_products").select(productColumns).eq("handle", handle).maybeSingle(),
    supabase.from("dishes").select(rowColumns).eq("shopify_handle", handle).order("position"),
  ]);
  if (!product.data) return null;
  return attach([product.data as Omit<AdminProduct, "rows">], (dishes.data ?? []) as DishRow[])[0];
}

export type PackageDish = { id: string; title_he: string; title_en: string; grp: string; active: boolean; image: string };

export async function adminPackageDishes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_package_dishes")
    .select("id, title_he, title_en, grp, active, image")
    .order("position");
  return (data ?? []) as PackageDish[];
}
