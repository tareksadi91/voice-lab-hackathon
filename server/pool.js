import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
let cache = null;

export function loadPool() {
  if (!cache) {
    const raw = readFileSync(join(__dirname, "..", "seed", "pool.json"), "utf8");
    cache = JSON.parse(raw);
  }
  return cache;
}
