import { readFileSync } from "node:fs";

const file = process.argv[2];
const html = readFileSync(new URL(`./${file}.html`, import.meta.url), "utf8");
const main = html.slice(html.indexOf("<main"), html.lastIndexOf("</main>"));
const text = main
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<style[\s\S]*?<\/style>/g, "")
  .replace(/<img[^>]*src="([^"]+)"[^>]*>/g, "\n[IMG $1]\n")
  .replace(/<a[^>]*href="([^"]+)"[^>]*>/g, "[A $1]")
  .replace(/<(br|\/p|\/h\d|\/li|\/div)[^>]*>/g, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ")
  .replace(/&#39;|&rsquo;/g, "'")
  .replace(/&quot;/g, '"')
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line, index, all) => line !== all[index - 1])
  .join("\n");
console.log(text.slice(0, Number(process.argv[3] ?? 6000)));
