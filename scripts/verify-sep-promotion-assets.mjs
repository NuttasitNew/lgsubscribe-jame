#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(root, ".gen/Price list_Sep_V3/generation-report.json");
const usedRoot = path.join(root, ".gen/Price list_Sep_V3/used");
const publicRoot = path.join(root, "public/images/products/promotions/sep-v3");
const expectedCount = 80;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
assert(report.products.length === expectedCount, `Expected ${expectedCount} campaign rows, found ${report.products.length}`);
assert(new Set(report.products.map((row) => row.folder)).size === expectedCount, "Duplicate source folders");

const reused = report.products.filter((row) => row.mode === "reuse");
assert(reused.length === 51, `Expected 51 reused August stills, found ${reused.length}`);

for (const row of report.products) {
  const canonicalPath = path.join(usedRoot, row.folder, `${row.folder}__Price-list_Sep_V3.png`);
  await fs.access(canonicalPath);
  const metadata = await sharp(canonicalPath).metadata();
  assert(metadata.width === 1254 && metadata.height === 1254, `${row.folder}: expected 1254x1254 PNG`);
  assert(metadata.format === "png" && metadata.hasAlpha, `${row.folder}: expected RGBA PNG`);
  if (row.mode === "reuse") {
    const stat = await fs.stat(canonicalPath);
    assert(stat.size > 800_000, `${row.folder}: reused still is too small to be the August studio original`);
  }
}

const publicPngs = (await fs.readdir(publicRoot)).filter((name) => name.endsWith(".png"));
assert(publicPngs.length === expectedCount, `Expected ${expectedCount} public PNGs, found ${publicPngs.length}`);
for (const name of publicPngs) {
  const metadata = await sharp(path.join(publicRoot, name)).metadata();
  assert(metadata.width === 1254 && metadata.height === 1254, `${name}: expected 1254x1254 PNG`);
}

console.log(`PASS: ${expectedCount} September promotion stills (${reused.length} reused studio originals); dimensions verified`);
