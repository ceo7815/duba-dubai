import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync(new URL("../../lib/store/catalog.json", import.meta.url), "utf8"));
const rows = Object.values(catalog.products)
  .filter((item) => item.images[0])
  .map((item) => `('${item.handle.replace(/'/g, "''")}','${item.images[0].replace(/'/g, "''")}')`);
console.log(
  `update public.dishes d set image_url = v.image from (values ${rows.join(",")}) as v(handle, image) where d.shopify_handle = v.handle returning d.shopify_handle;`,
);
