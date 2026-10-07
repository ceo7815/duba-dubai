import { readFileSync, writeFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync(new URL("../../lib/store/catalog.json", import.meta.url), "utf8"));

const order = [];
for (const collection of catalog.collections) for (const handle of collection.products) if (!order.includes(handle)) order.push(handle);
for (const handle of Object.keys(catalog.products)) if (!order.includes(handle)) order.push(handle);

const categoryOf = {
  specials: "מיוחדים",
  "main-courses": "עיקריות",
  "shabbat-meal-packages": "שבת",
  desserts: "קינוחים",
  combos: "עסקי",
  "soft-drinks": "שתייה",
  starters: "סלטים",
  "side-dishes": "תוספות",
  sandwiches: "כריכים",
};

const products = order.map((handle, position) => {
  const p = catalog.products[handle];
  const collections = catalog.collections.filter((c) => c.products.includes(handle)).map((c) => c.handle);
  const kept = [...new Set(p.variants.map((v) => v.kept))];
  const priced = kept.length > 1 || (kept[0] ?? "") !== "";
  return {
    h: handle,
    t: p.title,
    he: p.he,
    b: p.body,
    i: p.images,
    c: collections,
    g: p.tags,
    po: priced ? p.options[0]?.name ?? "Option" : "",
    x: (priced ? p.options.slice(1) : p.options).map((o) => ({ name: o.name, values: o.values })),
    p: position,
    cat: categoryOf[collections[0]] ?? "תוספות",
    r: kept.map((value, index) => {
      const variants = p.variants.filter((v) => v.kept === value);
      const compare = Math.max(0, ...variants.map((v) => v.compare ?? 0));
      return { k: value, pr: variants[0].price, cm: compare || null, o: position * 10 + index };
    }),
  };
});

const menu = catalog.menu.map((dish, position) => ({ ...dish, position }));

const productsSql = `with data as (select value as d from jsonb_array_elements($j$${JSON.stringify(products)}$j$::jsonb)),
ins as (
  insert into public.store_products (handle, title_en, title_he, body_en, images, collections, tags, price_option, extra_options, position)
  select d->>'h', d->>'t', d->>'he', d->>'b',
    array(select jsonb_array_elements_text(d->'i')), array(select jsonb_array_elements_text(d->'c')), array(select jsonb_array_elements_text(d->'g')),
    d->>'po', d->'x', (d->>'p')::int
  from data
  on conflict (handle) do update set title_en = excluded.title_en, title_he = excluded.title_he, body_en = excluded.body_en,
    images = excluded.images, collections = excluded.collections, tags = excluded.tags, price_option = excluded.price_option,
    extra_options = excluded.extra_options, position = excluded.position
  returning 1
),
rows as (
  select d->>'h' as handle, d->>'he' as he, d->'i'->>0 as image, d->>'cat' as category, r
  from data, jsonb_array_elements(d->'r') as r
),
added as (
  insert into public.dishes (name, label_he, price, compare, cost, grams, shortage, image_url, category, shopify_handle, variant_title, position)
  select case when r->>'k' = '' then he else he || ' · ' || (r->>'k') end, r->>'k', (r->>'pr')::numeric, nullif(r->>'cm', '')::numeric,
    0, 0, false, coalesce(image, ''), category, handle, r->>'k', (r->>'o')::int
  from rows
  where not exists (select 1 from public.dishes x where x.shopify_handle = rows.handle and x.variant_title = rows.r->>'k')
  returning 1
)
update public.dishes x set compare = nullif(r->>'cm', '')::numeric, position = (r->>'o')::int,
  label_he = case when position(' · ' in x.name) > 0 then split_part(x.name, ' · ', 2) else '' end
from rows where x.shopify_handle = rows.handle and x.variant_title = rows.r->>'k';`;

const menuSql = `insert into public.store_package_dishes (id, title_en, title_he, grp, fixed, image, position)
select value->>'id', value->>'title', value->>'he', value->>'group', (value->>'fixed')::boolean, value->>'image', (value->>'position')::int
from jsonb_array_elements($j$${JSON.stringify(menu)}$j$::jsonb)
on conflict (id) do update set title_en = excluded.title_en, title_he = excluded.title_he, grp = excluded.grp, fixed = excluded.fixed, image = excluded.image, position = excluded.position;`;

writeFileSync(new URL("./seed-menu-products.sql", import.meta.url), productsSql);
writeFileSync(new URL("./seed-menu-package.sql", import.meta.url), menuSql);
console.log("products sql", productsSql.length, "menu sql", menuSql.length);
