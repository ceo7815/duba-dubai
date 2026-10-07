export type PriceRow = {
  id: string;
  kept: string;
  label_he: string;
  price: string;
  compare: string;
  cost: string;
  grams: string;
  shortage: boolean;
};

export type ProductInput = {
  handle: string;
  isNew: boolean;
  title_en: string;
  title_he: string;
  body_en: string;
  body_he: string;
  images: string[];
  collections: string[];
  price_option: string;
  active: boolean;
  rows: PriceRow[];
};

export const menuCollections = [
  "main-courses",
  "side-dishes",
  "starters",
  "sandwiches",
  "combos",
  "desserts",
  "soft-drinks",
  "specials",
  "shabbat-meal-packages",
] as const;
