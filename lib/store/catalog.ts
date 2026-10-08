import data from "./catalog.json";

export type Variant = {
  id: number;
  title: string;
  options: string[];
  price: number;
  compare: number | null;
  available: boolean;
  kept: string;
};

export type Product = {
  handle: string;
  title: string;
  he: string;
  body: string;
  bodyHe?: string;
  tags: string[];
  options: { name: string; values: string[] }[];
  variants: Variant[];
  images: string[];
};

export type Collection = {
  handle: string;
  title: string;
  he: string;
  image: string;
  products: string[];
};

export type PackageGroup = "salad" | "starter" | "main";

export type MenuDish = {
  id: string;
  title: string;
  he: string;
  group: PackageGroup;
  fixed: boolean;
  image: string;
  available?: boolean;
};

export type PackageMenu = { limits: Record<PackageGroup, number>; dishes: MenuDish[] };

type Catalog = {
  products: Record<string, Product>;
  collections: Collection[];
  menu: MenuDish[];
  packages: Record<string, Record<PackageGroup, number>>;
  policies: Record<string, { title: string; html: string }>;
  customerPhotos: string[];
  extras: Record<"chef" | "story" | "people" | "kosher" | "shabbat" | "sides" | "video", string>;
};

export const catalog = data as Catalog;

export function isPackage(handle: string) {
  return handle in catalog.packages;
}

export function fromPrice(item: Product) {
  const prices = item.variants.map((variant) => variant.price);
  const low = Math.min(...prices);
  return { low, varies: prices.some((price) => price !== low) };
}

export function soldOut(item: Product) {
  return item.variants.every((variant) => !variant.available);
}

const drink = /coca|mirinda|sprite|water|soda/i;

export function drinkChoice(variant: Variant) {
  return variant.options.filter((option) => drink.test(option)).join(" / ");
}
