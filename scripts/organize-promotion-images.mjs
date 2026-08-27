#!/usr/bin/env node
/**
 * Split canonical promotion images by whether the website currently consumes
 * them. `used/` requires both a generated asset-map entry and a public file;
 * everything else stays in `unused/` until the next explicit sync.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ?? "Price list_Aug_V3";
const campaign = process.argv[3] ?? "aug-v3";
const sourceRoot = path.join(root, ".gen", source);
const usedRoot = path.join(sourceRoot, "used");
const unusedRoot = path.join(sourceRoot, "unused");
const publicRoot = path.join(root, "public", "images", "products", "promotions", campaign);
const assetModule = fs.readFileSync(path.join(root, "lib", "promotion-image-assets.ts"), "utf8");
const mappedModels = new Set(
  [...assetModule.matchAll(/sourceFolder:\s*"([^"]+)"/g)].map((match) => match[1]),
);

const publicFileName = (model) =>
  `${model.toLowerCase().replaceAll(".", "-")}__price-list-${campaign}.png`;
const isUsed = (model) =>
  mappedModels.has(model) && fs.existsSync(path.join(publicRoot, publicFileName(model)));

fs.mkdirSync(usedRoot, { recursive: true });
fs.mkdirSync(unusedRoot, { recursive: true });

const statusRoots = new Map([
  ["used", usedRoot],
  ["unused", unusedRoot],
]);
const candidates = [];

for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || statusRoots.has(entry.name)) continue;
  candidates.push({ model: entry.name, currentRoot: sourceRoot });
}

for (const statusRoot of statusRoots.values()) {
  for (const entry of fs.readdirSync(statusRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    candidates.push({ model: entry.name, currentRoot: statusRoot });
  }
}

for (const { model, currentRoot } of candidates) {
  const targetRoot = isUsed(model) ? usedRoot : unusedRoot;
  if (currentRoot === targetRoot) continue;
  const from = path.join(currentRoot, model);
  const to = path.join(targetRoot, model);
  if (fs.existsSync(to)) {
    throw new Error(`Refusing to overwrite existing promotion folder: ${to}`);
  }
  fs.renameSync(from, to);
}

const used = fs.readdirSync(usedRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const unused = fs.readdirSync(unusedRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const statusMarkdown = `# Promotion image status (${source})

- \`used/\`: copied to \`public/images/products/promotions/${campaign}\` and present in \`lib/promotion-image-assets.ts\`.
- \`unused/\`: generated and ready, but not yet synced into the website.
- Run \`npm run sync:promotion-images\` only when you want every ready image moved into website use.

## Used (${used.length})

${used.map((model) => `- \`${model}\``).join("\n")}

## Unused (${unused.length})

${unused.map((model) => `- \`${model}\``).join("\n")}
`;
fs.writeFileSync(path.join(sourceRoot, "STATUS.md"), statusMarkdown);

const sourcesPath = path.join(publicRoot, "SOURCES.md");
if (fs.existsSync(sourcesPath)) {
  const sources = fs
    .readFileSync(sourcesPath, "utf8")
    .replaceAll(`.gen/${source}/`, `.gen/${source}/used/`)
    .replaceAll(`.gen/${source}/used/used/`, `.gen/${source}/used/`);
  fs.writeFileSync(sourcesPath, sources);
}

console.log(JSON.stringify({ source, campaign, used: used.length, unused: unused.length }, null, 2));
