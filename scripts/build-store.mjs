import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { he } from "./he-names.mjs";

const shop = "https://dubakosher.com";
const imageDir = new URL("../public/store/", import.meta.url);
const sourceDir = new URL("./store-src/", import.meta.url);
mkdirSync(imageDir, { recursive: true });

const collectionHe = {
  "main-courses": "עיקריות",
  "side-dishes": "תוספות",
  starters: "סלטים",
  sandwiches: "כריכים",
  combos: "ארוחות עסקיות",
  desserts: "קינוחים",
  "soft-drinks": "שתייה קלה",
  specials: "ספיישל שף לשישי",
  "shabbat-meal-packages": "ארוחות שבת",
};
const collectionOrder = Object.keys(collectionHe);
const drink = /coca|mirinda|sprite|water|soda/i;

async function get(path) {
  const response = await fetch(`${shop}${path}`);
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return response.json();
}

const wanted = new Map();
function local(src, width = 1000) {
  if (!src) return "";
  const url = new URL(src.startsWith("//") ? `https:${src}` : src);
  const base = decodeURIComponent(url.pathname.split("/").pop()).replace(/\.\w+$/, "");
  const name = `${base.replace(/[^\w-]+/g, "_")}-${width}.webp`;
  url.searchParams.set("width", String(width));
  wanted.set(name, { url: url.toString(), width });
  return `/store/${name}`;
}

function kept(title) {
  const pieces = title.includes(" / ") ? title.split("/") : [title];
  return pieces
    .map((part) => part.trim())
    .filter((part) => part !== "Default Title" && !drink.test(part) && !/^french fries$/i.test(part))
    .join(" ");
}

function clean(html) {
  return String(html ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(\/?)(p|br|strong|b|em|i|ul|ol|li|h3|h4)\b[^>]*>/gi, "<$1$2>")
    .replace(/<(?!\/?(p|br|strong|b|em|i|ul|ol|li|h3|h4)>)[^>]+>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<p>\s*<\/p>/g, "")
    .trim();
}

const all = (await get("/products.json?limit=250")).products;
const products = {};
for (const product of all) {
  products[product.handle] = {
    handle: product.handle,
    title: product.title,
    he: he[product.title] ?? "",
    body: clean(product.body_html),
    tags: product.tags ?? [],
    options: (product.options ?? [])
      .filter((option) => !(option.values.length === 1 && option.values[0] === "Default Title"))
      .map((option) => ({ name: option.name, values: option.values })),
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      title: variant.title,
      options: [variant.option1, variant.option2, variant.option3].filter(Boolean),
      price: Number(variant.price),
      compare: variant.compare_at_price ? Number(variant.compare_at_price) : null,
      available: variant.available !== false,
      kept: kept(variant.title),
    })),
    images: (product.images ?? []).map((image) => local(image.src)),
  };
}

const listed = (await get("/collections.json?limit=250")).collections;
const collections = [];
for (const handle of collectionOrder) {
  const meta = listed.find((collection) => collection.handle === handle);
  const items = (await get(`/collections/${handle}/products.json?limit=250`)).products;
  collections.push({
    handle,
    title: meta?.title ?? handle,
    he: collectionHe[handle],
    image: meta?.image?.src ? local(meta.image.src) : "",
    products: items.map((item) => item.handle).filter((itemHandle) => products[itemHandle]),
  });
}

const groups = { סלט: "salad", ראשונה: "starter", עיקרית: "main" };
const menu = (await get("/collections/menu/products.json?limit=250")).products.flatMap((item) => {
  const group = Object.keys(groups).find((tag) => item.tags.includes(tag));
  if (!group) return [];
  return [
    {
      id: String(item.id),
      title: item.title,
      he: he[item.title] ?? "",
      group: groups[group],
      fixed: item.tags.includes("קבוע"),
      image: item.images?.[0]?.src ? local(item.images[0].src, 400) : "",
    },
  ];
});

function limits(file) {
  const html = readFileSync(new URL(file, sourceDir), "utf8");
  const block = html.match(/const maxItems = \{([\s\S]*?)\}/)?.[1] ?? "";
  const read = (tag) => Number(block.match(new RegExp(`'${tag}':\\s*(\\d+)`))?.[1] ?? 0);
  return { salad: read("סלט"), starter: read("ראשונה"), main: read("עיקרית") };
}
const packages = {
  "friday-couples-meal": limits("couple.html"),
  "family-friday-dinner": limits("products_family-friday-dinner.html"),
};

const policies = {};
for (const handle of ["privacy-policy", "refund-policy", "shipping-policy", "terms-of-service"]) {
  const html = readFileSync(new URL(`policies_${handle}.html`, sourceDir), "utf8");
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, "").trim() ?? handle;
  const start = html.indexOf("shopify-policy__body");
  const body = html.slice(html.indexOf(">", start) + 1, html.indexOf("</main>", start));
  policies[handle] = { title, html: clean(body.replace(/<div[^>]*>|<\/div>/g, "")) };
}

const home = readFileSync(new URL("home.html", sourceDir), "utf8");
const customerPhotos = [
  ...new Set(
    [...home.matchAll(/\/\/dubakosher\.com\/cdn\/shop\/files\/((?:IMG-2025|WhatsApp_2025)[^"?]+)\?v=\d+/g)].map(
      (match) => match[0],
    ),
  ),
].map((src) => local(src, 800));

const extras = {
  chef: local("//dubakosher.com/cdn/shop/files/1G4A2612.jpg?v=1745322081", 1500),
  story: local("//dubakosher.com/cdn/shop/files/Untitled-design-4.jpg?v=1745322067", 1500),
  people: local("//dubakosher.com/cdn/shop/files/logo_breath_10.png?v=1745853899", 1500),
  kosher: local("//dubakosher.com/cdn/shop/files/1_d1c78dbe-3e76-4ecf-ab4e-3487698be73e.png?v=1777211801", 2000),
  shabbat: local("//dubakosher.com/cdn/shop/files/Couple_s_Packages_Friday_Dinner.png?v=1762250699", 1500),
  sides: local("//dubakosher.com/cdn/shop/files/9bff606e-ce4b-4c58-a071-366050d46b66.jpg?v=1745305351", 1500),
  video: "/store/home-video.mp4",
};

writeFileSync(
  new URL("../lib/store/catalog.json", import.meta.url),
  JSON.stringify({ products, collections, menu, packages, policies, customerPhotos, extras }, null, 1),
);

const queue = [...wanted.entries()].filter(([name]) => !existsSync(new URL(name, imageDir)));
let failed = 0;
async function worker() {
  for (;;) {
    const next = queue.shift();
    if (!next) return;
    const [name, { url, width }] = next;
    const response = await fetch(url).catch(() => fetch(url)).catch(() => null);
    if (!response?.ok) {
      failed += 1;
      console.error("image", response?.status ?? "network", url);
      continue;
    }
    const webp = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 74 })
      .toBuffer();
    writeFileSync(new URL(name, imageDir), webp);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
const video = "home-video.mp4";
wanted.set(video, null);
if (!existsSync(new URL(video, imageDir))) {
  const response = await fetch(
    `${shop}/cdn/shop/videos/c/vp/ecc6db6092f844fdaadbfddf5388b244/ecc6db6092f844fdaadbfddf5388b244.HD-720p-4.5Mbps-46489384.mp4?v=0`,
  );
  if (response.ok) writeFileSync(new URL(video, imageDir), Buffer.from(await response.arrayBuffer()));
  else failed += 1;
}
for (const name of readdirSync(imageDir)) {
  if (!wanted.has(name) && !failed) unlinkSync(new URL(name, imageDir));
}
console.log(
  Object.keys(products).length,
  "products,",
  collections.length,
  "collections,",
  menu.length,
  "package dishes,",
  wanted.size,
  "images,",
  failed,
  "failed",
  JSON.stringify(packages),
);
