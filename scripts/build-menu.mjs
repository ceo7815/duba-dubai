import { writeFileSync } from "node:fs";
import { he } from "./he-names.mjs";

const sizeHe = {
  "for two": "לזוג",
  "for two ( 4 pieces)": "לזוג",
  family: "משפחתי",
  "family (10 pieces)": "משפחתי",
  "1/2 kg": "חצי קילו",
  "1 kg": "קילו",
  frozen: "קפוא",
  ready: "מוכן",
  without: "בלי תוספת",
  herbs: "עשבי תיבול",
  mushrooms: "פטריות",
  onion: "בצל",
};

const categories = [
  ["starters", "סלטים", 225],
  ["main-courses", "עיקריות", 200],
  ["side-dishes", "תוספות", 0],
  ["sandwiches", "כריכים", 200],
  ["shabbat-meal-packages", "שבת", 0],
  ["soft-drinks", "שתייה", 0],
  ["desserts", "קינוחים", 0],
  ["combos", "עסקי", 200],
  ["specials", "מיוחדים", 200],
  ["menu", "תפריט", 0],
];

const drink = /coca|mirinda|sprite|water|soda/i;

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

const products = (await get("https://dubakosher.com/products.json?limit=250")).products;
const byHandle = new Map(products.map((product) => [product.handle, product]));
const placed = new Map();

for (const [handle, category, grams] of categories) {
  const collection = await get(`https://dubakosher.com/collections/${handle}/products.json?limit=250`);
  for (const item of collection.products) {
    if (!placed.has(item.handle)) placed.set(item.handle, { category, grams });
  }
}

const rows = [];
for (const product of products) {
  const meta = placed.get(product.handle) ?? { category: "תפריט", grams: 0 };
  const base = he[product.title] ?? product.title;
  const variants = product.variants ?? [];
  const choices = [];
  const seen = new Set();
  for (const variant of variants) {
    const pieces = variant.title.includes(" / ") ? variant.title.split("/") : [variant.title];
    const kept = pieces
      .map((part) => part.trim())
      .filter((part) => part !== "Default Title" && !drink.test(part) && !/^french fries$/i.test(part))
      .join(" ");
    const key = `${kept}|${variant.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push({ label: kept, price: variant.price });
  }
  choices.forEach((choice) => {
    const size = sizeHe[choice.label.toLowerCase()] ?? "";
    const name = size ? `${base} · ${size}` : base;
    rows.push({
      name,
      base,
      price: Number(choice.price),
      grams: meta.grams,
      category: meta.category,
      image_url: product.images?.[0]?.src ?? "",
      shopify_handle: product.handle,
      variant_title: choice.label,
      position: rows.length,
    });
  });
  if (!byHandle.has(product.handle)) throw new Error(product.handle);
}

for (let index = rows.length - 1; index >= 0; index -= 1) {
  if (rows[index].price <= 0) rows.splice(index, 1);
}
rows.forEach((row, index) => {
  row.position = index;
});

const counts = new Map();
for (const row of rows) counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
for (const row of rows) {
  if (row.price === 0 && counts.get(row.name) > 1) row.name = `${row.name} כלול`;
}

writeFileSync(new URL("./menu.json", import.meta.url), JSON.stringify(rows, null, 2));

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
const values = rows
  .map(
    (row) =>
      `(${sql(row.name)}, ${row.grams}, ${row.price}, ${sql(row.image_url)}, ${sql(row.category)}, ${sql(row.shopify_handle)}, ${sql(row.variant_title)}, ${row.position})`,
  )
  .join(",\n");
const statement = `insert into public.dishes (name, grams, price, image_url, category, shopify_handle, variant_title, position)
values
${values}
on conflict (shopify_handle, variant_title) where shopify_handle <> ''
do update set
  name = excluded.name,
  grams = excluded.grams,
  price = excluded.price,
  image_url = excluded.image_url,
  category = excluded.category,
  position = excluded.position;`;
writeFileSync(new URL("./menu.sql", import.meta.url), statement);
console.log(rows.length, "rows", rows.filter((row) => !he[row.base] && row.base === row.name).length, "untranslated");
