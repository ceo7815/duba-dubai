import fs from "node:fs";

const lines = fs.readFileSync(".next/dev/logs/next-development.log", "utf8").trim().split("\n");
const last = lines
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter((entry) => entry?.source === "Browser" && /hydrated/.test(entry.message))
  .at(-1);
if (!last) process.exit(0);
console.log(last.timestamp);
console.log(
  last.message
    .split("\n")
    .filter((line) => /^\s*[+-] |^\s*<[a-z]/.test(line))
    .join("\n"),
);
