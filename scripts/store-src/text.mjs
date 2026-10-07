import fs from "node:fs";

for (const name of process.argv.slice(2)) {
  let html = fs.readFileSync(new URL(`./${name}.html`, import.meta.url), "utf8");
  html = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  const lines = main
    .replace(/<img[^>]*src="([^"]+)"[^>]*>/g, "\n[img $1]\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  console.log(`=== ${name}`);
  console.log(lines.join("\n"));
}
