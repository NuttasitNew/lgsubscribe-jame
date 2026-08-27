#!/usr/bin/env node
/**
 * Copy canonical monthly promotion stills into `public/` and refresh the
 * generated asset map. The website never reads `.gen` at runtime.
 *
 * Usage:
 *   node scripts/sync-promotion-images.mjs
 *   node scripts/sync-promotion-images.mjs --source "Price list_Aug_V3" --campaign aug-v3
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_DIR_MARKERS = [
  "__rejected-layout-",
  "__pre-hanging-tag-",
  `${path.sep}tmp${path.sep}`,
  `${path.sep}backup${path.sep}`,
  `${path.sep}preview${path.sep}`,
];

function parseArgs(argv) {
  const options = {
    source: "Price list_Aug_V3",
    campaign: "aug-v3",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--source" && value) {
      options.source = value;
      index += 1;
    } else if (flag === "--campaign" && value) {
      options.campaign = value;
      index += 1;
    }
  }

  return options;
}

function assertAllowedSource(sourceRoot) {
  const resolved = path.resolve(sourceRoot);
  const genRoot = path.join(root, ".gen") + path.sep;
  if (!resolved.startsWith(genRoot)) {
    throw new Error(`Promotion source must stay inside .gen: ${resolved}`);
  }

  for (const marker of FORBIDDEN_DIR_MARKERS) {
    if (resolved.includes(marker)) {
      throw new Error(`Refusing forbidden promotion source path: ${resolved}`);
    }
  }
}

function publicFileName(sourceFolder, campaign) {
  const slug = sourceFolder.toLowerCase().replaceAll(".", "-");
  return `${slug}__price-list-${campaign}.png`;
}

function writeAssetModule(filePath, assets) {
  const rows = assets
    .map(
      (asset) =>
        `  {\n    sourceFolder: ${JSON.stringify(asset.sourceFolder)},\n    publicPath: ${JSON.stringify(asset.publicPath)},\n  },`,
    )
    .join("\n");

  const contents = `export type PromotionImageAsset = {
  sourceFolder: string;
  publicPath: string;
};

/** Filled by \`npm run sync:promotion-images\`. Do not edit by hand. */
export const promotionImageAssets: PromotionImageAsset[] = [
${rows}
];
`;

  fs.writeFileSync(filePath, contents);
}

function writeSourcesMarkdown(filePath, sourceDirname, campaign, assets, canonicalSuffix) {
  const rows = assets
    .map(
      (asset) =>
        `| \`${path.basename(asset.publicPath)}\` | \`${asset.sourceFolder}\` | \`.gen/${sourceDirname}/used/${asset.sourceFolder}/${asset.sourceFolder}${canonicalSuffix}\` |`,
    )
    .join("\n");

  const contents = `# Product promotion stills (${campaign})

Copied from the canonical generated set in \`.gen/${sourceDirname}/used\`.
The website serves only these public files. Do not point pages at \`.gen\`, rejected layouts, pre-hanging-tag backups, or \`tmp\`.

| Public file | Source folder | Canonical original |
| --- | --- | --- |
${rows}
`;

  fs.writeFileSync(filePath, contents);
}

const { source, campaign } = parseArgs(process.argv.slice(2));
const sourceRoot = path.join(root, ".gen", source);
const destDir = path.join(root, "public", "images", "products", "promotions", campaign);
const assetModulePath = path.join(root, "lib", "promotion-image-assets.ts");
const expectedFileSuffix = `__${source.replaceAll(" ", "-")}.png`;
const usedRoot = path.join(sourceRoot, "used");
const unusedRoot = path.join(sourceRoot, "unused");

assertAllowedSource(sourceRoot);

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Canonical promotion folder is missing: ${sourceRoot}`);
}

fs.mkdirSync(destDir, { recursive: true });
fs.mkdirSync(usedRoot, { recursive: true });
fs.mkdirSync(unusedRoot, { recursive: true });

const assets = [];

for (const statusRoot of [usedRoot, unusedRoot]) {
  for (const entry of fs.readdirSync(statusRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const sourceFolder = entry.name;
    const canonicalName = `${sourceFolder}${expectedFileSuffix}`;
    const sourceFile = path.join(statusRoot, sourceFolder, canonicalName);
    if (!fs.existsSync(sourceFile)) {
      console.warn(`skip ${sourceFolder}: missing ${canonicalName}`);
      continue;
    }

    const fileName = publicFileName(sourceFolder, campaign);
    const destFile = path.join(destDir, fileName);
    fs.copyFileSync(sourceFile, destFile);

    assets.push({
      sourceFolder,
      publicPath: `/images/products/promotions/${campaign}/${fileName}`,
      sourceStatusRoot: statusRoot,
    });
  }
}

assets.sort((left, right) => left.sourceFolder.localeCompare(right.sourceFolder));

writeAssetModule(assetModulePath, assets);
writeSourcesMarkdown(path.join(destDir, "SOURCES.md"), source, campaign, assets, expectedFileSuffix);

for (const asset of assets) {
  if (asset.sourceStatusRoot !== unusedRoot) continue;
  fs.renameSync(
    path.join(unusedRoot, asset.sourceFolder),
    path.join(usedRoot, asset.sourceFolder),
  );
}

console.log(`Copied ${assets.length} canonical promotion stills to ${path.relative(root, destDir)} and marked them used`);
