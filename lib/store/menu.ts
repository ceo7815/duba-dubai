import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { catalog, isPackage, type Collection, type MenuDish, type Product, type Variant } from "./catalog";

type MenuRow = { kept: string; label_he: string; price: number; compare: number | null; available: boolean };

type MenuProduct = {
  handle: string;
  title: string;
  he: string;
  body: string;
  body_he: string;
  images: string[];
  collections: string[];
  tags: string[];
  price_option: string;
  extra_options: { name: string; values: string[] }[];
  rows: MenuRow[];
};

type MenuData = { products: MenuProduct[]; package_dishes: MenuDish[] };

function combinations(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((all, values) => all.flatMap((prefix) => values.map((value) => [...prefix, value])), [[]]);
}

function toProduct(row: MenuProduct): Product {
  const extras = (row.extra_options ?? []).filter((option) => option.values.length > 0);
  const priced = row.price_option !== "";
  const combos = combinations(extras.map((option) => option.values));
  const variants: Variant[] = row.rows.flatMap((price, index) =>
    combos.map((combo, comboIndex) => {
      const options = priced ? [price.kept, ...combo] : combo;
      return {
        id: index * 1000 + comboIndex,
        title: options.join(" / "),
        options,
        price: Number(price.price),
        compare: price.compare === null ? null : Number(price.compare),
        available: price.available,
        kept: price.kept,
      };
    }),
  );
  return {
    handle: row.handle,
    title: row.title,
    he: row.he,
    body: row.body,
    bodyHe: row.body_he,
    tags: row.tags ?? [],
    options: priced ? [{ name: row.price_option, values: row.rows.map((price) => price.kept) }, ...extras] : extras,
    variants,
    images: row.images ?? [],
  };
}

function build(products: Product[], menu: MenuDish[], placement: Map<string, string[]>) {
  const byHandle = Object.fromEntries(products.map((item) => [item.handle, item]));
  const collections: Collection[] = catalog.collections.map((meta) => ({
    ...meta,
    products: products.filter((item) => placement.get(item.handle)?.includes(meta.handle)).map((item) => item.handle),
  }));
  const specials = new Set(collections.find((item) => item.handle === "specials")?.products ?? []);

  function collection(handle: string) {
    return collections.find((item) => item.handle === handle) ?? null;
  }

  return {
    products: byHandle,
    collections,
    menu,
    specials,
    product(handle: string): Product | null {
      return byHandle[handle] ?? null;
    },
    collection,
    collectionProducts(handle: string): Product[] {
      if (handle === "all") return products.filter((item) => (placement.get(item.handle)?.length ?? 0) > 0);
      return (collection(handle)?.products ?? []).map((key) => byHandle[key]).filter(Boolean);
    },
    fridayOnly(handle: string) {
      return isPackage(handle) || specials.has(handle);
    },
  };
}

function fromFile() {
  const placement = new Map<string, string[]>();
  for (const meta of catalog.collections) {
    for (const handle of meta.products) placement.set(handle, [...(placement.get(handle) ?? []), meta.handle]);
  }
  const order = [...new Set(catalog.collections.flatMap((meta) => meta.products))];
  const rest = Object.keys(catalog.products).filter((handle) => !order.includes(handle));
  return build([...order, ...rest].map((handle) => catalog.products[handle]), catalog.menu, placement);
}

export const getStore = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("store_menu");
  const menu = data as MenuData | null;
  if (error || !menu || menu.products.length === 0) {
    console.error("store_menu failed, using the bundled catalog", error?.message);
    return fromFile();
  }
  const products = menu.products.filter((row) => row.rows.length > 0).map(toProduct);
  const placement = new Map(menu.products.map((row) => [row.handle, row.collections ?? []]));
  return build(products, menu.package_dishes, placement);
});

export type Store = Awaited<ReturnType<typeof getStore>>;
