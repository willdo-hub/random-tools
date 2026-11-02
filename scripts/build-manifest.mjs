// Scans top-level folders for a tool.json and writes tools.json for the hub page.
// A folder is a tool if it contains tool.json. Folders starting with "." or "_" are skipped.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const tools = [];

for (const dir of readdirSync(root).sort()) {
  if (dir.startsWith(".") || dir.startsWith("_")) continue;
  const full = join(root, dir);
  if (!statSync(full).isDirectory()) continue;
  const metaPath = join(full, "tool.json");
  if (!existsSync(metaPath)) continue;

  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8"));
  } catch (err) {
    console.error(`✗ ${dir}/tool.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  if (!meta.description) {
    console.error(`✗ ${dir}/tool.json is missing a "description"`);
    process.exit(1);
  }
  if (!existsSync(join(full, "index.html"))) {
    console.warn(`! ${dir} has no index.html — it will be listed but the link will 404`);
  }

  tools.push({
    slug: dir,
    name: meta.name || dir,
    description: meta.description,
    icon: meta.icon || "🧰",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
  });
}

writeFileSync(join(root, "tools.json"), JSON.stringify({ tools }, null, 2) + "\n");
console.log(`✓ Wrote tools.json with ${tools.length} tool(s): ${tools.map((t) => t.slug).join(", ") || "(none)"}`);
