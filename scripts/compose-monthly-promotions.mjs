#!/usr/bin/env node
/**
 * Monthly promotion stills are layered, not restyled from another product.
 *
 * Shared (does not change monthly):
 *   public/images/products/promotions/shared/studio-plate.png
 *     beige studio + circle + podium + red footer
 *
 * Product packshots:
 *   public/images/products/lg-catalog/...
 *
 * Each campaign folder:
 *   .gen/promotions/<campaign>/tags/{folder}.png
 *   .gen/promotions/<campaign>/prices/{folder}.png
 *   public/images/products/promotions/<campaign>/{slug}__price-list-{campaign}.png
 *
 * Usage:
 *   node scripts/compose-monthly-promotions.mjs --campaign sep-v4
 *   node scripts/compose-monthly-promotions.mjs --campaign sep-v4 --only OLED65C6PSA.ATM,GC-G24FFQKB.AEEPLM1
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANVAS = 1254;
const FOOTER_TOP = 1115;
const STUDIO_TTC = "/System/Library/Fonts/Supplemental/SukhumvitSet.ttc";
const STUDIO_FONT = "Sukhumvit Set";
const COPY_RENDERER = path.join(root, "scripts/render-sukhumvit-copy.py");
const DEFAULT_INSPECT = path.join(
  root,
  "outputs/01a06a46-19cf-70b0-a5c0-724c99b0aeb2/Price list Sep_V4.xlsx.inspect.ndjson",
);
const PLATE_SOURCE = path.join(
  root,
  "public/images/products/promotions/aug-v3/gc-g24ffqkb-aeeplm1__price-list-aug-v3.png",
);
const FOOTER_SOURCE = path.join(
  root,
  "public/images/products/promotions/aug-v3/art13a-sr1__price-list-aug-v3.png",
);

const sourceOverrides = {
  "WD516AN / WD518AN": ["WD516AN", "WD518AN"],
  "55QNED80BSA.ATM": ["QNED80B"],
  "27LX6TDGA.ATM": ["27LX6TDGA"],
  "LG xboom Grab": ["GRAB"],
  "LG xboom Bounce": ["BOUNCE"],
  "LG xboom STAGE301": ["STAGE301"],
  "32U889SA-W.ATM": ["32U889SA"],
};

const extraImageOverrides = {
  "PTOL24FFCBB.APTO": ["/images/products/lg-catalog/ms2032gas.jpg"],
  "DD23GMWE1S.ATH": ["/images/products/lg-catalog/as30ggw10.png"],
  "27LX6TDGA.GRAB": ["/images/products/lg-catalog/grab.jpg"],
  "32U889.GRAB": ["/images/products/lg-catalog/grab.jpg"],
  "OLED77C6PSA.S80TY": ["/images/products/lg-catalog/s80ty.jpg"],
  "OLED65C6PSA.S80TY": ["/images/products/lg-catalog/s80ty.jpg"],
};

const COPY_OVERRIDES = {
  "GC-G24FFQKB.AEEPLM1": {
    eyebrow: "ตู้เย็น",
    title: "LG InstaView Multi-Door",
    subtitle: "ขนาด 22.5 คิว รุ่น GC-G24FFQKB.AEEPLM1",
    bullets: [
      "InstaView™ เคาะดูภายใน",
      "UVnano™ ดูแลหัวจ่ายน้ำ",
      "LINEARCooling™ รักษาความสด",
      "DoorCooling+™ เย็นเร็วทั่วถึง",
      "Smart Inverter Compressor™",
      "ควบคุมผ่าน LG ThinQ™",
    ],
  },
  "OLED65C6PSA.ATM": {
    eyebrow: "โทรทัศน์",
    title: "LG OLED evo C6",
    subtitle: 'ขนาด 65" รุ่น OLED65C6PSA',
    bullets: ["Perfect Black", "Dolby Vision / Atmos", "AI Processor", "webOS Smart"],
  },
  "OLED55C6PSA.ATM": {
    eyebrow: "โทรทัศน์",
    title: "LG OLED evo C6",
    subtitle: 'ขนาด 55" รุ่น OLED55C6PSA',
    bullets: ["Perfect Black", "Dolby Vision / Atmos", "AI Processor", "webOS Smart"],
  },
  "OLED77C6PSA.ATM": {
    eyebrow: "โทรทัศน์",
    title: "LG OLED evo C6",
    subtitle: 'ขนาด 77" รุ่น OLED77C6PSA',
    bullets: ["Perfect Black", "Dolby Vision / Atmos", "AI Processor", "webOS Smart"],
  },
  "OLED83C6PSA.ATM": {
    eyebrow: "โทรทัศน์",
    title: "LG OLED evo C6",
    subtitle: 'ขนาด 83" รุ่น OLED83C6PSA',
    bullets: ["Perfect Black", "Dolby Vision / Atmos", "AI Processor", "webOS Smart"],
  },
};

function parseArgs(argv) {
  const options = { campaign: "sep-v4", inspect: DEFAULT_INSPECT, only: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--campaign" && value) {
      options.campaign = value;
      index += 1;
    } else if (flag === "--inspect" && value) {
      options.inspect = path.resolve(root, value);
      index += 1;
    } else if (flag === "--only" && value) {
      options.only = value.split(",");
      index += 1;
    }
  }
  return options;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function studioFontFaceCss() {
  return `@font-face { font-family: '${STUDIO_FONT}'; src: url('file://${STUDIO_TTC}') format('truetype'); }`;
}

function parseArrayLiteral(filePath, variableName) {
  const source = ts.createSourceFile(
    filePath,
    ts.sys.readFile(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let initializer;
  const walk = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === variableName) {
      initializer = node.initializer;
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  if (!initializer) throw new Error(`Missing ${variableName} in ${filePath}`);
  return { source, initializer };
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literalValue);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(
      node.properties
        .filter(ts.isPropertyAssignment)
        .map((property) => [property.name.text ?? property.name.getText(), literalValue(property.initializer)]),
    );
  }
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literalValue(node.expression);
  throw new Error(`Unsupported generated literal: ${node.getText()}`);
}

function readCatalogSources() {
  const catalogModule = path.join(root, "lib/catalog-products.ts");
  const { source, initializer } = parseArrayLiteral(catalogModule, "catalogProductSources");
  const object = ts.isAsExpression(initializer) ? initializer.expression : initializer;
  if (!ts.isObjectLiteralExpression(object)) throw new Error("catalogProductSources is not an object literal");
  return object.properties.filter(ts.isPropertyAssignment).map((property) => {
    const key = property.name.text ?? property.name.getText(source).replaceAll('"', "");
    const record = { key };
    for (const field of property.initializer.properties.filter(ts.isPropertyAssignment)) {
      record[field.name.text ?? field.name.getText(source)] = literalValue(field.initializer);
    }
    record.officialModel ??= key;
    return record;
  });
}

function readKnowledgeGuides() {
  const { initializer } = parseArrayLiteral(path.join(root, "lib/product-knowledge.ts"), "productKnowledgeGuides");
  return literalValue(initializer);
}

function readCampaignProducts(inspectPath) {
  const table = fs
    .readFileSync(inspectPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line))
    .find((entry) => entry.kind === "table" && entry.sheet === "รายการราคา");
  if (!table) throw new Error(`Missing รายการราคา table in ${inspectPath}`);
  const [headers, ...rows] = table.values;
  const column = Object.fromEntries(headers.map((header, index) => [header, index]));
  const groups = new Map();
  for (const row of rows) {
    if (row[column["แบบการขาย"]] !== "Subscription" || !row[column["รุ่น"]]) continue;
    const model = row[column["รุ่น"]];
    const entry = groups.get(model) ?? {
      model,
      category: row[column["หมวดสินค้า"]],
      details: row[column["รายละเอียดรุ่น"]],
      sourcePage: row[column["หน้า"]],
      monthlyPrices: [],
      promotions: new Set(),
    };
    const price = row[column["ราคาปกติต่อเดือน"]];
    if (Number.isFinite(price)) entry.monthlyPrices.push(price);
    const promotion = String(row[column["รายละเอียดโปรโมชัน"]] ?? "").trim();
    if (promotion && promotion !== "-") entry.promotions.add(promotion);
    groups.set(model, entry);
  }
  return [...groups.values()].map((entry) => ({
    model: entry.model,
    category: entry.category,
    details: entry.details,
    sourcePage: entry.sourcePage,
    monthlyPrice: Math.min(...entry.monthlyPrices),
    promotions: [...entry.promotions],
  }));
}

function normalizedModel(value) {
  let normalized = value.trim().toUpperCase();
  normalized = normalized.replace(/^LG\s+XBOOM\s+/, "");
  normalized = normalized.replace(/^(?:GC|GN|GV)-/, "");
  normalized = normalized.replace(/\.(?:ATM|ATH|SR1|A[A-Z0-9]+|D[A-Z0-9]+)$/, "");
  return normalized.replace(/[^A-Z0-9]/g, "");
}

function sourceFolder(model) {
  if (model === "WD516AN / WD518AN") return "WD516AN-WD518AN";
  if (model === "LG xboom Grab") return "GRAB";
  if (model === "LG xboom Bounce") return "BOUNCE";
  if (model === "LG xboom STAGE301") return "STAGE301";
  return model;
}

function slugModel(model) {
  return sourceFolder(model).toLowerCase().replaceAll(".", "-");
}

function resolveSources(product, catalogSources) {
  const overrideKeys = sourceOverrides[product.model];
  const matches = overrideKeys
    ? overrideKeys.map((key) => catalogSources.find((source) => source.key === key))
    : catalogSources.filter(
        (source) =>
          normalizedModel(source.officialModel) === normalizedModel(product.model) ||
          normalizedModel(source.key) === normalizedModel(product.model),
      );
  const unique = [...new Map(matches.filter(Boolean).map((source) => [source.key, source])).values()];
  if (!unique.length) return [];
  if (unique.length > 1 && !overrideKeys) {
    const exact = unique.filter((source) => source.officialModel === product.model);
    if (exact.length === 1) return exact;
  }
  return unique;
}

function isNearWhite(red, green, blue, threshold = 228) {
  return (
    red > threshold &&
    green > threshold &&
    blue > threshold &&
    Math.max(red, green, blue) - Math.min(red, green, blue) < 22
  );
}

async function sampleRgb(source, left, top, size = 24) {
  const patch = await sharp(source).extract({ left, top, width: size, height: size }).raw().toBuffer({
    resolveWithObject: true,
  });
  let red = 0;
  let green = 0;
  let blue = 0;
  const count = patch.data.length / patch.info.channels;
  for (let index = 0; index < patch.data.length; index += patch.info.channels) {
    red += patch.data[index];
    green += patch.data[index + 1];
    blue += patch.data[index + 2];
  }
  return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
}

function studioPlateSvg() {
  return Buffer.from(`
    <svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="wash" cx="42%" cy="40%" r="78%">
          <stop offset="0%" stop-color="rgb(248,247,246)"/>
          <stop offset="38%" stop-color="rgb(244,243,242)"/>
          <stop offset="68%" stop-color="rgb(236,218,202)"/>
          <stop offset="100%" stop-color="rgb(228,203,184)"/>
        </radialGradient>
        <radialGradient id="spot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgb(252,252,252)"/>
          <stop offset="58%" stop-color="rgb(248,247,246)"/>
          <stop offset="100%" stop-color="rgb(248,247,246)" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${CANVAS}" height="${CANVAS}" fill="url(#wash)"/>
      <circle cx="400" cy="470" r="360" fill="url(#spot)"/>
    </svg>
  `);
}

function isOnPodium(x, y) {
  const cx = 340;
  const topY = 1008;
  const bottomY = 1106;
  const rx = 292;
  const ry = 30;
  if (y < topY - ry || y > bottomY) return false;
  if (y <= topY + ry) {
    return ((x - cx) / rx) ** 2 + ((y - topY) / ry) ** 2 <= 1;
  }
  const t = (y - (topY + ry)) / (bottomY - (topY + ry));
  const sideRx = rx * (1 + t * 0.04);
  return x >= cx - sideRx && x <= cx + sideRx;
}

async function extractStudioPlate(outputPath) {
  const { data, info } = await sharp(PLATE_SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const studio = await sharp(studioPlateSvg()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [podiumR, podiumG, podiumB] = await sampleRgb(PLATE_SOURCE, 96, 1008, 28);
  const isStudioRed = (red, green, blue) => red > 150 && green < 110 && blue < 110 && red - green > 50;
  const isDarkProduct = (red, green, blue) => red + green + blue < 420;
  const isPodiumTone = (red, green, blue) => {
    const luma = (red + green + blue) / 3;
    return luma > 210 && Math.max(red, green, blue) - Math.min(red, green, blue) < 24;
  };
  const inPricePill = (x, y) => x >= 690 && x <= 1180 && y >= 858 && y <= 985;

  for (let y = 0; y < FOOTER_TOP; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const keepPriceChrome =
        y >= 766 &&
        (isStudioRed(red, green, blue) || (inPricePill(x, y) && isNearWhite(red, green, blue, 220)));
      if (keepPriceChrome) continue;

      if (isOnPodium(x, y)) {
        if (isDarkProduct(red, green, blue) || !isPodiumTone(red, green, blue)) {
          data[index] = podiumR;
          data[index + 1] = podiumG;
          data[index + 2] = podiumB;
          data[index + 3] = 255;
        }
        continue;
      }

      data[index] = studio.data[index];
      data[index + 1] = studio.data[index + 1];
      data[index + 2] = studio.data[index + 2];
      data[index + 3] = 255;
    }
  }

  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outputPath);
  return outputPath;
}

function promotionBadge(product) {
  const text = product.promotions.join(" | ");
  const discountMonths = text.match(/50%\s*(\d+)\s*เดือน/i)?.[1];
  const advanceBills = text.match(/50%\s*(\d+)\s*บิล/i)?.[1];
  if (text.includes("99.-")) return { kind: "99-nine-bills" };
  if (text.includes("149.-")) return { kind: "149-discount", months: Number(discountMonths || 7) };
  if (advanceBills) return { kind: "advance-50", months: Number(advanceBills) };
  return { kind: "advance-50", months: 6 };
}

function tagOverlaySvg(badge, centerX, centerY) {
  const text =
    badge.kind === "99-nine-bills"
      ? `<text x="0" y="-16" font-size="22" font-weight="600">9 รอบบิลแรก</text>
         <text x="0" y="48" font-size="55" font-weight="700">99.-</text>`
      : badge.kind === "advance-50"
        ? `<text x="0" y="-18" font-size="22" font-weight="600">ลด 50%</text>
           <text x="0" y="28" font-size="28" font-weight="700">${badge.months} รอบบิล</text>`
        : `<text x="0" y="-47" font-size="27" font-weight="500">บิลแรก</text>
           <text x="0" y="7" font-size="49" font-weight="700">149.-</text>
           <text x="0" y="49" font-size="22" font-weight="500">และลด 50%</text>
           <text x="0" y="84" font-size="25" font-weight="600">${badge.months} รอบบิล</text>`;
  return Buffer.from(`
    <svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${studioFontFaceCss()}</style>
        <linearGradient id="tagRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ff3038"/>
          <stop offset="1" stop-color="#dc101a"/>
        </linearGradient>
      </defs>
      <g transform="translate(${centerX} ${centerY}) rotate(-8)" font-family="${STUDIO_FONT}" fill="#fff" text-anchor="middle">
        <path d="M -42 -130 Q -54 -130 -61 -119 L -73 -91 L -73 108 Q -73 125 -56 125 L 56 125 Q 73 125 73 108 L 73 -91 L 20 -130 Z"
          fill="url(#tagRed)" stroke="#d9141e" stroke-width="2"/>
        <circle cx="0" cy="-94" r="14" fill="#ffffff"/>
        ${text}
      </g>
    </svg>
  `);
}

const PRICE_CARD = { x: 693, y: 861, width: 480, height: 120 };

async function renderText(text, fontSize, fontWeight, fill = "#e7242b") {
  const svg = Buffer.from(`
    <svg width="900" height="160" xmlns="http://www.w3.org/2000/svg">
      <defs><style>${studioFontFaceCss()}</style></defs>
      <text x="10" y="115" fill="${fill}" font-family="${STUDIO_FONT}"
        font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(text)}</text>
    </svg>
  `);
  return sharp(svg).trim().png().toBuffer({ resolveWithObject: true });
}

async function priceOverlay(price) {
  const formatted = Number(price).toLocaleString("en-US");
  const card = PRICE_CARD;
  const pill = Buffer.from(`
    <svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${card.x}" y="${card.y}" width="${card.width}" height="${card.height}"
        rx="${Math.floor(card.height / 2)}" fill="#ffffff"/>
    </svg>
  `);
  let priceFontSize = String(Math.trunc(price)).length >= 4 ? 82 : 94;
  let gap = 6;
  let priceText = await renderText(`${formatted}.-`, priceFontSize, 700);
  let monthText = await renderText("/เดือน", 34, 600);
  const available = card.width - 56;
  while (priceText.info.width + gap + monthText.info.width > available && priceFontSize > 58) {
    priceFontSize -= 4;
    priceText = await renderText(`${formatted}.-`, priceFontSize, 700);
  }
  const contentWidth = priceText.info.width + gap + monthText.info.width;
  const left = card.x + Math.round((card.width - contentWidth) / 2);
  const top = card.y + Math.round((card.height - priceText.info.height) / 2);
  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: pill, left: 0, top: 0 },
      { input: priceText.data, left, top },
      {
        input: monthText.data,
        left: left + priceText.info.width + gap,
        top: top + Math.max(7, Math.round(priceText.info.height * 0.14)),
      },
    ])
    .png()
    .toBuffer();
}

function productPlacement(category) {
  if (/โทรทัศน์|มอนิเตอร์|Sound bar|xboom/i.test(category)) {
    return { maxWidth: 620, maxHeight: 430, centerX: 400, bottomY: 1008 };
  }
  return { maxWidth: 500, maxHeight: 620, centerX: 400, bottomY: 1008 };
}

function tagPlacement(category) {
  if (/โทรทัศน์|มอนิเตอร์/i.test(category)) return { centerX: 560, centerY: 200 };
  return { centerX: 560, centerY: 210 };
}

async function isolatePackshot(inputPath, maxWidth, maxHeight) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const index = pixel * channels;
    if (!isNearWhite(data[index], data[index + 1], data[index + 2], 248)) return;
    data[index + 3] = 0;
    queue.push(pixel);
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pixel = queue[cursor];
    enqueue((pixel % width) - 1, Math.floor(pixel / width));
    enqueue((pixel % width) + 1, Math.floor(pixel / width));
    enqueue(pixel % width, Math.floor(pixel / width) - 1);
    enqueue(pixel % width, Math.floor(pixel / width) + 1);
  }
  return sharp(data, { raw: { width, height, channels } })
    .trim()
    .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });
}

function posterCopy(product, source, guides) {
  if (COPY_OVERRIDES[product.model]) return COPY_OVERRIDES[product.model];
  const guide = guides.find((item) =>
    item.models.some((model) => normalizedModel(model) === normalizedModel(source.key)),
  );
  const eyebrow = String(product.category).split("/")[0].trim();
  return {
    eyebrow,
    title: source.name?.replace(/^LG\s+/, "LG ") ?? product.model,
    subtitle: `รุ่น ${product.model}`,
    bullets: (guide?.highlights ?? ["LG ThinQ™"]).slice(0, 6),
  };
}

function renderSukhumvitCopy(copy, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [COPY_RENDERER], { stdio: ["pipe", "inherit", "inherit"] });
    child.stdin.write(JSON.stringify({ copy, output: outputPath }));
    child.stdin.end();
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`Sukhumvit copy renderer exited ${code}`));
    });
  });
}

async function composeProduct(product, context) {
  const folder = sourceFolder(product.model);
  const sources = resolveSources(product, context.catalogSources);
  if (!sources.length) {
    console.warn(`skip    ${folder}: no catalog packshot`);
    return null;
  }
  const extra = extraImageOverrides[product.model] ?? [];
  const imagePaths = [...new Set([sources[0].image, ...extra])];
  const placement = productPlacement(product.category);
  const prepared = [];
  for (const relativePath of imagePaths) {
    const filePath = path.join(root, "public", relativePath.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      console.warn(`skip    ${folder}: missing ${relativePath}`);
      return null;
    }
    prepared.push(await isolatePackshot(filePath, placement.maxWidth, placement.maxHeight));
  }
  const gap = 16;
  const totalWidth = prepared.reduce((sum, image) => sum + image.info.width, 0) + (prepared.length - 1) * gap;
  let left = placement.centerX - Math.round(totalWidth / 2);
  const productLayers = prepared.map((image) => {
    const layer = {
      input: image.data,
      left: Math.max(36, left),
      top: Math.max(160, placement.bottomY - image.info.height),
    };
    left += image.info.width + gap;
    return layer;
  });

  const tagCenter = tagPlacement(product.category);
  const tagPath = path.join(context.monthRoot, "tags", `${folder}.png`);
  const pricePath = path.join(context.monthRoot, "prices", `${folder}.png`);
  const copyPath = path.join(context.monthRoot, "copy", `${folder}.png`);
  await fsPromises.mkdir(path.dirname(tagPath), { recursive: true });
  await fsPromises.mkdir(path.dirname(pricePath), { recursive: true });
  await fsPromises.mkdir(path.dirname(copyPath), { recursive: true });
  await sharp(tagOverlaySvg(promotionBadge(product), tagCenter.centerX, tagCenter.centerY)).png().toFile(tagPath);
  await sharp(await priceOverlay(product.monthlyPrice)).png().toFile(pricePath);
  await renderSukhumvitCopy(posterCopy(product, sources[0], context.guides), copyPath);

  const outputName = `${slugModel(folder)}__price-list-${context.campaign}.png`;
  const publicPath = path.join(context.publicRoot, outputName);
  await sharp(context.platePath)
    .composite([
      ...productLayers,
      { input: copyPath, left: 0, top: 0 },
      { input: tagPath, left: 0, top: 0 },
      { input: pricePath, left: 0, top: 0 },
    ])
    .png()
    .toFile(publicPath);

  return {
    folder,
    monthlyPrice: product.monthlyPrice,
    publicPath: `/images/products/promotions/${context.campaign}/${outputName}`,
  };
}

const options = parseArgs(process.argv.slice(2));
const platePath = path.join(root, "public/images/products/promotions/shared/studio-plate.png");
const monthRoot = path.join(root, ".gen/promotions", options.campaign);
const publicRoot = path.join(root, "public/images/products/promotions", options.campaign);

if (!fs.existsSync(PLATE_SOURCE)) {
  throw new Error("Missing August studio source for the shared plate");
}

await fsPromises.mkdir(publicRoot, { recursive: true });
await extractStudioPlate(platePath);
console.log(`plate   ${path.relative(root, platePath)}`);

const products = readCampaignProducts(options.inspect);
const catalogSources = readCatalogSources();
const guides = readKnowledgeGuides();
const selected = options.only
  ? products.filter((product) => options.only.includes(product.model) || options.only.includes(sourceFolder(product.model)))
  : products;

const report = [];
for (const product of selected) {
  const row = await composeProduct(product, {
    campaign: options.campaign,
    platePath,
    monthRoot,
    publicRoot,
    catalogSources,
    guides,
  });
  if (!row) continue;
  report.push(row);
  console.log(`compose ${row.folder}: ${Number(row.monthlyPrice).toLocaleString("en-US")} บาท`);
}

await fsPromises.mkdir(monthRoot, { recursive: true });
await fsPromises.writeFile(path.join(monthRoot, "compose-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Composed ${report.length} ${options.campaign} stills into ${path.relative(root, publicRoot)}`);
