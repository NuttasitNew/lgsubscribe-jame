#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaign = "sep-v3";
const campaignModule = path.join(root, "lib/sep-subscription-campaign.ts");
const catalogModule = path.join(root, "lib/catalog-products.ts");
const knowledgeModule = path.join(root, "lib/product-knowledge.ts");
const augPublicRoot = path.join(root, "public/images/products/promotions/aug-v3");
const augGenRoot = path.join(root, ".gen/Price list_Aug_V3");
const canonicalRoot = path.join(root, ".gen/Price list_Sep_V3/used");

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

const omittedSeptemberModels = [
  "A9T-LITE.DCGPETH",
  "GV-V25FFGRB.ABMPLMT",
  "MS3032JAS.BBKPETH",
  "PTODFC553FV.APTO",
  "TX2723ST5J.APBPETH",
  "WT2116SHEG.ABGPETH",
];

const promotionTagChanges = new Map([
  ["FV1413S4M.AMBPETH", { centerX: 619, centerY: 245, angle: -6, kind: "149-discount", months: 7 }],
  ["GC-L257SFZW.APYPLMT", { centerX: 615, centerY: 240, angle: -10, kind: "149-discount", months: 2 }],
  ["GC-X257CMHW.AEEPLMT", { centerX: 615, centerY: 240, angle: -10, kind: "149-discount", months: 2 }],
  ["WD110MN.ABGPLMT", { centerX: 610, centerY: 240, angle: -10, kind: "99-nine-bills" }],
  ["WD516AN-WD518AN", { centerX: 610, centerY: 240, angle: -10, kind: "99-nine-bills" }],
  ["WT2520NHEG.ABGPETH", { centerX: 619, centerY: 245, angle: -6, kind: "149-discount", months: 5 }],
  ["WT2520NHEN.ABNPETH", { centerX: 619, centerY: 245, angle: -6, kind: "149-discount", months: 5 }],
]);

const restyleTemplates = {
  "100QNED86BS.ATM": "100MRGB96BS.ATM",
  "55QNED80BSA.ATM": "100MRGB96BS.ATM",
  "65QNED80BSA.ATM": "100MRGB96BS.ATM",
  "85QNED80BSA.ATM": "100MRGB96BS.ATM",
  "65NU855BPSA.ATM": "100MRGB96BS.ATM",
  "75NU855BPSA.ATM": "100MRGB96BS.ATM",
  "OLED55C6PSA.ATM": "100MRGB96BS.ATM",
  "OLED65C6PSA.ATM": "100MRGB96BS.ATM",
  "OLED77C6PSA.ATM": "100MRGB96BS.ATM",
  "OLED55C6PSA.S30A": "OLED77C6PSA.S80TY",
  "OLED65C6PSA.S80TY": "OLED77C6PSA.S80TY",
  "27LX6TDGA.ATM": "100MRGB96BS.ATM",
  "27LX6TDGA.GRAB": "100MRGB96BS.ATM",
  "32LX6BDGA.ATM": "100MRGB96BS.ATM",
  "32U889SA-W.ATM": "100MRGB96BS.ATM",
  "32U889.GRAB": "100MRGB96BS.ATM",
  "34U650A-B.ATM": "100MRGB96BS.ATM",
  "DFC533FV.APYPETH": "DFC335HM.ABMPETH",
  "GC-X24FFCRB.AEVPLM1": "GC-G24FFQKB.AEEPLM1",
  "GN-F392PQAK.AEPPLM1": "GN-F452PQAK.AEPPLMT",
  "GV-B25FFGDB.ABMPLMT": "GV-V25FFGRB.ABMPLMT",
  "MS4295DIS.BBKPETH": "MS3032JAS.BBKPETH",
  "TX2523AT7G.AEGPETH": "TX2315DT5G.DEGPETH",
  "TX2726ST5J.APBPETH": "TX2723ST5J.APBPETH",
  GRAB: "SAQ11A",
  BOUNCE: "SAQ11A",
  STAGE301: "SAQ11A",
  "S70TY.ATHALLD": "SAQ11A",
  "S95TR.DTHALLK": "SAQ11A",
};

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

function readCampaignProducts() {
  const { initializer } = parseArrayLiteral(campaignModule, "sepSubscriptionCampaignProducts");
  return literalValue(initializer);
}

function readCatalogSources() {
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
  const { initializer } = parseArrayLiteral(knowledgeModule, "productKnowledgeGuides");
  return literalValue(initializer);
}

function normalizedModel(value) {
  let normalized = value.trim().toUpperCase();
  normalized = normalized.replace(/^LG\s+XBOOM\s+/, "");
  normalized = normalized.replace(/^(?:GC|GN|GV)-/, "");
  normalized = normalized.replace(/\.(?:ATM|ATH|SR1|A[A-Z0-9]+|D[A-Z0-9]+)$/, "");
  return normalized.replace(/[^A-Z0-9]/g, "");
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
  if (!unique.length) throw new Error(`No exact catalog source for ${product.model}`);
  if (unique.length > 1 && !overrideKeys) {
    const exact = unique.filter((source) => source.officialModel === product.model);
    if (exact.length === 1) return exact;
    throw new Error(`Ambiguous catalog sources for ${product.model}: ${unique.map((item) => item.key).join(", ")}`);
  }
  return unique;
}

function sourceFolder(model) {
  if (model === "WD516AN / WD518AN") return "WD516AN-WD518AN";
  if (model === "LG xboom Grab") return "GRAB";
  if (model === "LG xboom Bounce") return "BOUNCE";
  if (model === "LG xboom STAGE301") return "STAGE301";
  return model;
}

function slugModel(model) {
  return model.toLowerCase().replaceAll(".", "-");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function findStudioSource(folder) {
  const candidates = [
    path.join(augPublicRoot, `${slugModel(folder)}__price-list-aug-v3.png`),
    path.join(augGenRoot, "used", folder, `${folder}__Price-list_Aug_V3.png`),
    path.join(augGenRoot, "unused", folder, `${folder}__Price-list_Aug_V3.png`),
  ];
  return candidates.find((candidate) => fileExists(candidate));
}

function getPriceLayout(price) {
  const digitCount = String(Math.trunc(price)).length;
  if (![3, 4].includes(digitCount)) {
    throw new Error(`Unsupported monthly price: ${price}`);
  }
  return {
    formattedPrice: Number(price).toLocaleString("en-US"),
    digitCount,
    priceFontSize: digitCount === 4 ? 82 : 94,
  };
}

async function renderText(text, fontSize, fontWeight, fill = "#e7242b") {
  const svg = Buffer.from(`
    <svg width="900" height="160" xmlns="http://www.w3.org/2000/svg">
      <defs><style>${studioFontFaceCss()}</style></defs>
      <text x="10" y="115" fill="${fill}"
        font-family="${STUDIO_FONT}"
        font-size="${fontSize}" font-weight="${fontWeight}"
      >${escapeXml(text)}</text>
    </svg>
  `);
  return sharp(svg).trim().png().toBuffer({ resolveWithObject: true });
}

async function detectWhitePriceCard(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const crop = { x: 500, y: 740, width: 730, height: 310 };
  const mask = new Uint8Array(crop.width * crop.height);

  for (let y = 0; y < crop.height; y += 1) {
    for (let x = 0; x < crop.width; x += 1) {
      const sourceOffset = ((y + crop.y) * info.width + x + crop.x) * 4;
      const red = data[sourceOffset];
      const green = data[sourceOffset + 1];
      const blue = data[sourceOffset + 2];
      const brightest = Math.max(red, green, blue);
      const darkest = Math.min(red, green, blue);
      if (red > 238 && green > 238 && blue > 238 && brightest - darkest < 14) {
        mask[y * crop.width + x] = 1;
      }
    }
  }

  const seen = new Uint8Array(mask.length);
  const candidates = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    const queue = [start];
    seen[start] = 1;
    let cursor = 0;
    let area = 0;
    let minX = crop.width;
    let maxX = 0;
    let minY = crop.height;
    let maxY = 0;

    while (cursor < queue.length) {
      const index = queue[cursor];
      cursor += 1;
      const y = Math.floor(index / crop.width);
      const x = index % crop.width;
      area += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      const neighbors = [];
      if (x > 0) neighbors.push(index - 1);
      if (x + 1 < crop.width) neighbors.push(index + 1);
      if (y > 0) neighbors.push(index - crop.width);
      if (y + 1 < crop.height) neighbors.push(index + crop.width);
      for (const neighbor of neighbors) {
        if (!mask[neighbor] || seen[neighbor]) continue;
        seen[neighbor] = 1;
        queue.push(neighbor);
      }
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const absoluteX = minX + crop.x;
    const absoluteY = minY + crop.y;
    if (
      area > 20_000 &&
      width >= 330 &&
      width <= 550 &&
      height >= 90 &&
      height <= 145 &&
      absoluteX >= 580 &&
      absoluteY >= 830
    ) {
      candidates.push({ area, x: absoluteX, y: absoluteY, width, height });
    }
  }

  candidates.sort((left, right) => right.area - left.area);
  if (!candidates[0]) {
    throw new Error(`Could not detect white price card in ${source}`);
  }
  return candidates[0];
}

function cardOverlaySvg(card) {
  return Buffer.from(`
    <svg width="1254" height="1254" xmlns="http://www.w3.org/2000/svg">
      <rect x="${card.x}" y="${card.y}" width="${card.width}"
        height="${card.height}" rx="${Math.floor(card.height / 2)}"
        fill="#ffffff" />
    </svg>
  `);
}

const STUDIO_FOOTER_TOP = 1115;
const SUKHUMVIT_TTC = "/System/Library/Fonts/Supplemental/SukhumvitSet.ttc";
const STUDIO_FONT = "Sukhumvit Set";
const SAQ11A_PRODUCT = { maxWidth: 520, maxHeight: 400, centerX: 340, bottomY: 885 };
const TV_PRODUCT = { maxWidth: 620, maxHeight: 400, centerX: 318, bottomY: 800, lifestyle: true };
const APPLIANCE_PRODUCT = { maxWidth: 500, maxHeight: 520, centerX: 340, bottomY: 962 };
const STANDBYME_PRODUCT = { maxWidth: 420, maxHeight: 560, centerX: 318, bottomY: 800, lifestyle: true, keepLightProduct: true };
const MONITOR_PRODUCT = { maxWidth: 600, maxHeight: 580, centerX: 340, bottomY: 885, lifestyle: true };
const SOUNDBAR_PRODUCT = { maxWidth: 660, maxHeight: 340, centerX: 318, bottomY: 800, maxComponents: 2 };
const SPEAKER_PRODUCT = { maxWidth: 430, maxHeight: 360, centerX: 318, bottomY: 820 };
const SAQ11A_TAG = { centerX: 410, centerY: 205, angle: -8 };
const TV_TAG = { centerX: 500, centerY: 185, angle: -8 };
const LIFESTYLE_TAG = { centerX: 540, centerY: 195, angle: -8 };
const STANDBYME_FOLDERS = new Set(["27LX6TDGA.ATM", "27LX6TDGA.GRAB", "32LX6BDGA.ATM"]);
const MONITOR_FOLDERS = new Set(["32U889SA-W.ATM", "32U889.GRAB", "34U650A-B.ATM"]);
const SOUNDBAR_FOLDERS = new Set(["S70TY.ATHALLD", "S95TR.DTHALLK"]);
const SPEAKER_FOLDERS = new Set(["GRAB", "BOUNCE", "STAGE301"]);
const restylePackshotCrops = {
  "27LX6TDGA.ATM": { left: 0, top: 0, width: 0.5, height: 1 },
  "27LX6TDGA.GRAB": { left: 0, top: 0, width: 0.5, height: 1 },
};

function restylePlacement(templateFolder, folder) {
  if (STANDBYME_FOLDERS.has(folder)) return STANDBYME_PRODUCT;
  if (MONITOR_FOLDERS.has(folder)) return MONITOR_PRODUCT;
  if (SOUNDBAR_FOLDERS.has(folder)) return SOUNDBAR_PRODUCT;
  if (SPEAKER_FOLDERS.has(folder)) return SPEAKER_PRODUCT;
  if (templateFolder === "100MRGB96BS.ATM" || templateFolder === "OLED77C6PSA.S80TY") return TV_PRODUCT;
  if (templateFolder === "SAQ11A") return SAQ11A_PRODUCT;
  return APPLIANCE_PRODUCT;
}

function tagPlacement(_folder, _templateFolder) {
  return SAQ11A_TAG;
}

function studioFontFaceCss() {
  return `@font-face { font-family: 'Sukhumvit Set'; src: url('file://${SUKHUMVIT_TTC}') format('truetype'); }`;
}
const studioFooterSource = path.join(
  augPublicRoot,
  "art13a-sr1__price-list-aug-v3.png",
);

async function studioFooterOverlay() {
  return sharp(studioFooterSource)
    .extract({
      left: 0,
      top: STUDIO_FOOTER_TOP,
      width: 1254,
      height: 1254 - STUDIO_FOOTER_TOP,
    })
    .png()
    .toBuffer();
}

function promotionBadge(product) {
  const text = product.promotions.join(" | ");
  const discountMonths = text.match(/50%\s*(\d+)\s*เดือน/i)?.[1];
  const advanceBills = text.match(/50%\s*(\d+)\s*บิล/i)?.[1];
  const gift = text.match(/แถมฟร[ีิ]\s*([^|]+)/)?.[1]?.trim();
  if (text.includes("99.-")) return { kind: "99-nine-bills", gift };
  if (text.includes("149.-")) {
    return { kind: "149-discount", months: Number(discountMonths || 7), gift };
  }
  if (advanceBills) return { kind: "advance-50", months: Number(advanceBills), gift };
  if (gift) return { kind: "gift", gift };
  return null;
}

function promotionTagOverlaySvg(change) {
  const { centerX, centerY, angle = -8, kind, scale = 1 } = change;
  const text =
    kind === "99-nine-bills"
      ? `
      <text x="0" y="-16" font-size="22" font-weight="600">9 รอบบิลแรก</text>
      <text x="0" y="48" font-size="55" font-weight="700">99.-</text>
    `
      : kind === "advance-50"
        ? `
      <text x="0" y="-18" font-size="22" font-weight="600">ลด 50%</text>
      <text x="0" y="28" font-size="28" font-weight="700">${change.months} รอบบิล</text>
    `
        : kind === "gift"
          ? `
      <text x="0" y="8" font-size="24" font-weight="700">แถมฟรี</text>
    `
          : `
      <text x="0" y="-47" font-size="27" font-weight="500">บิลแรก</text>
      <text x="0" y="7" font-size="49" font-weight="700">149.-</text>
      <text x="0" y="49" font-size="22" font-weight="500">และลด 50%</text>
      <text x="0" y="84" font-size="25" font-weight="600">${change.months} รอบบิล</text>
    `;

  return Buffer.from(`
    <svg width="1254" height="1254" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${studioFontFaceCss()}</style>
        <linearGradient id="tagRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ff3038" />
          <stop offset="1" stop-color="#dc101a" />
        </linearGradient>
        <filter id="tagShadow" x="-25%" y="-20%" width="150%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#740000" flood-opacity="0.28" />
        </filter>
      </defs>
      <g transform="translate(${centerX} ${centerY}) rotate(${angle}) scale(${scale})" filter="url(#tagShadow)">
        <path d="M -42 -130 Q -54 -130 -61 -119 L -73 -91 L -73 108 Q -73 125 -56 125 L 56 125 Q 73 125 73 108 L 73 -91 L 20 -130 Z"
          fill="url(#tagRed)" stroke="#d9141e" stroke-width="2" />
        <circle cx="0" cy="-94" r="14" fill="#ffffff" opacity="0.96" />
        <g fill="#ffffff" font-family="${STUDIO_FONT}"
          text-anchor="middle">${text}</g>
      </g>
    </svg>
  `);
}

async function composePriceOnCard(card, price) {
  const layout = getPriceLayout(price);
  const horizontalPadding = 28;
  const availableWidth = card.width - horizontalPadding * 2;
  let priceFontSize = layout.priceFontSize;
  let monthFontSize = 34;
  let gap = 6;
  let priceText = await renderText(`${layout.formattedPrice}.-`, priceFontSize, 700);
  let monthText = await renderText("/เดือน", monthFontSize, 600);
  let contentWidth = priceText.info.width + gap + monthText.info.width;

  if (contentWidth > availableWidth) {
    const scale = availableWidth / contentWidth;
    priceFontSize = Math.floor(priceFontSize * scale);
    monthFontSize = Math.floor(monthFontSize * scale);
    gap = Math.max(4, Math.floor(gap * scale));
    priceText = await renderText(`${layout.formattedPrice}.-`, priceFontSize, 700);
    monthText = await renderText("/เดือน", monthFontSize, 600);
    contentWidth = priceText.info.width + gap + monthText.info.width;
  }

  if (contentWidth > availableWidth) {
    throw new Error(`Scaled price content still exceeds card: ${contentWidth}px > ${availableWidth}px`);
  }

  const contentLeft = card.x + Math.round((card.width - contentWidth) / 2);
  const priceTop = card.y + Math.round((card.height - priceText.info.height) / 2);
  return {
    card,
    layout,
    padding: {
      left: contentLeft - card.x,
      right: card.x + card.width - (contentLeft + contentWidth),
    },
    inputs: [
      { input: cardOverlaySvg(card), left: 0, top: 0 },
      { input: priceText.data, left: contentLeft, top: priceTop },
      {
        input: monthText.data,
        left: contentLeft + priceText.info.width + gap,
        top: priceTop + Math.max(7, Math.round(priceText.info.height * 0.14)),
      },
    ],
  };
}

async function buildPriceComposites(source, price) {
  return composePriceOnCard(await detectWhitePriceCard(source), price);
}

function wrapText(value, maxUnits, maxLines) {
  const words = String(value)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  const lines = [];
  let line = "";
  const units = (text) => [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 1.05 : 0.58), 0);
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (units(candidate) <= maxUnits || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function posterCopy(product, source, guides) {
  const guide = guides.find((item) =>
    item.models.some((model) => normalizedModel(model) === normalizedModel(source.key)),
  );
  const bullets = (guide?.highlights ?? ["LG ThinQ™"]).slice(0, 4);
  const overrides = {
    GRAB: {
      eyebrow: "ลำโพงพกพา",
      title: "LG xboom Grab",
      subtitle: "tuned by will.i.am",
      bullets: ["กันน้ำกันฝุ่น IP67", "เล่นต่อเนื่องสูงสุด 20 ชั่วโมง", "Party Link และ Auracast™", "ชาร์จ USB-C"],
    },
    BOUNCE: {
      eyebrow: "ลำโพงพกพา",
      title: "LG xboom Bounce",
      subtitle: "tuned by will.i.am",
      bullets: ["กันน้ำกันฝุ่น IP67", "เล่นต่อเนื่องสูงสุด 30 ชั่วโมง", "Party Link และ Auracast™", "ชาร์จ USB-C"],
    },
    STAGE301: {
      eyebrow: "ลำโพงปาร์ตี้",
      title: "LG xboom Stage 301",
      subtitle: "tuned by will.i.am",
      bullets: ["กำลังขับ 120 วัตต์", "กันน้ำ IPX4", "เล่นต่อเนื่องสูงสุด 12 ชั่วโมง", "Party Link และ Auracast™"],
    },
    "S70TY.ATHALLD": {
      eyebrow: "ซาวด์บาร์",
      title: "LG Soundbar S70TY",
      subtitle: "Dolby Atmos 3.1.1 ch",
      bullets: ["กำลังขับ 400W", "Hi-res 24bit/96kHz", "ซาวด์บาร์พร้อมซับวูฟเฟอร์", "จับคู่ทีวี LG ได้ลงตัว"],
    },
    "S95TR.DTHALLK": {
      eyebrow: "ซาวด์บาร์",
      title: "LG Soundbar S95TR",
      subtitle: "Dolby Atmos 9.1.5 ch",
      bullets: ["กำลังขับ 820W", "Hi-res 24bit/96kHz", "ซาวด์บาร์พร้อมซับวูฟเฟอร์", "จับคู่ทีวี LG ได้ลงตัว"],
    },
    "27LX6TDGA.ATM": {
      eyebrow: "จอไลฟ์สไตล์",
      title: "LG StanbyME 2",
      subtitle: 'ขนาด 27" รุ่น 27LX6TDGA',
      bullets: ['จอ 27" 4K webOS', "หมุนจอได้รอบทิศ", "แบตในตัว พกพาได้"],
    },
    "27LX6TDGA.GRAB": {
      eyebrow: "จอไลฟ์สไตล์",
      title: "LG StanbyME 2 + Grab",
      subtitle: "แถมลำโพง xboom Grab",
      bullets: ['จอ 27" 4K webOS', "หมุนจอได้รอบทิศ", "แบตในตัว พกพาได้"],
    },
    "32LX6BDGA.ATM": {
      eyebrow: "จอไลฟ์สไตล์",
      title: "LG StanbyME 2 Max",
      subtitle: 'ขนาด 32" รุ่น 32LX6BDGA',
      bullets: ['จอ 32" 4K webOS', "หมุนจอได้รอบทิศ", "แบตในตัว พกพาได้"],
    },
    "32U889SA-W.ATM": {
      eyebrow: "จอมอนิเตอร์",
      title: "LG Smart Monitor Swing",
      subtitle: 'ขนาด 31.5" รุ่น 32U889SA',
      bullets: ["4K IPS Swing", "webOS Smart", "ขาตั้งหมุนได้"],
    },
    "32U889.GRAB": {
      eyebrow: "จอมอนิเตอร์",
      title: "Smart Monitor + Grab",
      subtitle: "แถมลำโพง xboom Grab",
      bullets: ["4K IPS Swing", "webOS Smart", "ขาตั้งหมุนได้"],
    },
    "34U650A-B.ATM": {
      eyebrow: "จอมอนิเตอร์",
      title: "LG UltraWide 34U650A",
      subtitle: 'ขนาด 34" WQHD 100Hz',
      bullets: ['จอ 34" UltraWide', "WQHD 100Hz", "USB-C เชื่อมต่อ"],
    },
    "55QNED80BSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG QNED80",
      subtitle: 'ขนาด 55" รุ่น 55QNED80BSA',
      bullets: ["4K UHD และ webOS", "Dolby Vision / Atmos", "VRR สำหรับเกม", "เมจิก รีโมท"],
    },
    "65QNED80BSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG QNED80",
      subtitle: 'ขนาด 65" รุ่น 65QNED80BSA',
      bullets: ["4K UHD และ webOS", "Dolby Vision / Atmos", "VRR สำหรับเกม", "เมจิก รีโมท"],
    },
    "85QNED80BSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG QNED80",
      subtitle: 'ขนาด 85" รุ่น 85QNED80BSA',
      bullets: ["4K UHD และ webOS", "Dolby Vision / Atmos", "VRR สำหรับเกม", "เมจิก รีโมท"],
    },
    "100QNED86BS.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG QNED86",
      subtitle: 'ขนาด 100" รุ่น 100QNED86BS',
      bullets: ["จอใหญ่ 4K webOS", "Dolby Vision / Atmos", "QNED evo Mini LED", "เมจิก รีโมท"],
    },
    "65NU855BPSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG NANO NU85",
      subtitle: 'ขนาด 65" รุ่น 65NU855BPSA',
      bullets: ["4K UHD และ webOS", "AI Picture", "เมจิก รีโมท"],
    },
    "75NU855BPSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG NANO NU85",
      subtitle: 'ขนาด 75" รุ่น 75NU855BPSA',
      bullets: ["4K UHD และ webOS", "AI Picture", "เมจิก รีโมท"],
    },
    "OLED55C6PSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG OLED evo C6",
      subtitle: 'ขนาด 55" รุ่น OLED55C6PSA',
      bullets: ["Perfect Black", "Dolby Vision / Atmos", "AI Processor", "webOS Smart"],
    },
    "OLED65C6PSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG OLED evo C6",
      subtitle: 'ขนาด 65" รุ่น OLED65C6PSA',
      bullets: ["Perfect Black", "Dolby Vision / Atmos", "AI Processor", "webOS Smart"],
    },
    "OLED77C6PSA.ATM": {
      eyebrow: "โทรทัศน์",
      title: "LG OLED evo C6",
      subtitle: 'ขนาด 77" รุ่น OLED77C6PSA',
      bullets: ["Perfect Black", "Dolby Vision / Atmos", "AI Processor", "webOS Smart"],
    },
    "OLED65C6PSA.S80TY": {
      eyebrow: "ชุดทีวีและซาวด์บาร์",
      title: "OLED C6 + S80TY",
      subtitle: 'ทีวี 65" พร้อมซาวด์บาร์',
      bullets: ["OLED evo Perfect Black", "ซาวด์บาร์ 480W", "Dolby Atmos"],
    },
    "OLED55C6PSA.S30A": {
      eyebrow: "ชุดทีวีและซาวด์บาร์",
      title: "OLED C6 + S30A",
      subtitle: 'ทีวี 55" พร้อมซาวด์บาร์',
      bullets: ["OLED evo Perfect Black", "ซาวด์บาร์ 150W", "Dolby Atmos"],
    },
    "GC-X24FFCRB.AEVPLM1": {
      eyebrow: "ตู้เย็น",
      title: "LG InstaView Multi-Door",
      subtitle: "ขนาด 22.5 คิว รุ่น GC-X24FFCRB",
      bullets: ["Multi Air Flow", "Fresh Balancer™", "UVnano™", "Smart Inverter"],
    },
    "GN-F392PQAK.AEPPLM1": {
      eyebrow: "ตู้เย็น",
      title: "LG 2 ประตู",
      subtitle: "ขนาด 13.9 คิว รุ่น GN-F392PQAK",
      bullets: ["Multi Air Flow", "Smart Inverter", "LG ThinQ™"],
    },
    "TX2726ST5J.APBPETH": {
      eyebrow: "เครื่องซักผ้า",
      title: "LG ฝาบน 26 กก.",
      subtitle: "รุ่น TX2726ST5J",
      bullets: ["AI DD™ และ 6 Motion™", "TurboWash™ 360", "Inverter Direct Drive", "LG ThinQ™"],
    },
    "TX2523AT7G.AEGPETH": {
      eyebrow: "เครื่องซักผ้า",
      title: "LG ฝาบน",
      subtitle: "รุ่น TX2523AT7G",
      bullets: ["AI DD™", "TurboWash™", "LG ThinQ™"],
    },
    "GV-B25FFGDB.ABMPLMT": {
      eyebrow: "ตู้เย็น",
      title: "LG Multi-Door",
      subtitle: "ขนาด 21.6 คิว รุ่น GV-B25FFGDB",
      bullets: ["Multi Air Flow", "Fresh Balancer™", "UVnano™", "Smart Inverter"],
    },
    "DFC533FV.APYPETH": {
      eyebrow: "เครื่องล้างจาน",
      title: "LG QuadWash",
      subtitle: "รุ่น DFC533FV",
      bullets: ["QuadWash™", "TrueSteam™ ตามรุ่น", "EasyRack™ Plus", "Inverter Direct Drive"],
    },
    "MS4295DIS.BBKPETH": {
      eyebrow: "ไมโครเวฟ",
      title: "LG NeoChef™",
      subtitle: "ขนาด 42 ลิตร รุ่น MS4295DIS",
      bullets: ["Smart Inverter", "EasyClean™", "ความจุ 42 ลิตร", "ไฟ LED ภายใน"],
    },
    "OLED77C6PSA.S80TY": {
      eyebrow: "ชุดทีวีและซาวด์บาร์",
      title: "OLED C6 + S80TY",
      subtitle: 'ทีวี 77" พร้อมซาวด์บาร์',
      bullets: ["OLED evo Perfect Black", "ซาวด์บาร์ 480W", "Dolby Atmos"],
    },
  };
  const override = overrides[product.model] ?? overrides[sourceFolder(product.model)];
  if (override) return { bullets, ...override };

  const name = source.name;
  const sizeMatch = name.match(/(\d[\d,.]*)\s*(?:\"|นิ้ว|BTU|Btu|คิว|ลิตร)/);
  const lineMatch = name.match(/LG\s+(.+?)\s+รุ่น/) || name.match(/LG\s+([^0-9]+)/);
  const eyebrow = product.category.split("/")[0].trim();
  const title = lineMatch ? `LG ${lineMatch[1].replace(/\s+/g, " ").trim()}` : name.split("รุ่น")[0].trim();
  const modelLabel = product.model.replace(/\.(?:ATM|ATH|SR1|A[A-Z0-9]+|D[A-Z0-9]+)$/, "");
  const subtitle = [sizeMatch ? `ขนาด ${sizeMatch[0].replace(",", "")}` : null, `รุ่น ${modelLabel}`]
    .filter(Boolean)
    .join(" ");
  return {
    eyebrow,
    title: title.replace(/\s+2026$/, "").slice(0, 40),
    subtitle,
    bullets,
  };
}

const RESTYLE_CIRCLE = { cx: 318, cy: 528, r: 286 };

async function writeStudioPlate(source, outputPath, { erasePodium = false } = {}) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const sampleRgb = async (left, top, size = 24) => {
    const patch = await sharp(source).extract({ left, top, width: size, height: size }).raw().toBuffer({ resolveWithObject: true });
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
  };
  const [beigeR, beigeG, beigeB] = await sampleRgb(36, 36, 48);
  const [circleR, circleG, circleB] = await sampleRgb(210, 220, 20);
  const cx = 448;
  const cy = 505;
  const inCircle = (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= 358 * 358;
  const isRed = (red, green, blue) => red > 170 && green < 90 && blue < 90 && red - green > 80;
  const isNearWhite = (red, green, blue) =>
    red > 220 && green > 220 && blue > 220 && Math.max(red, green, blue) - Math.min(red, green, blue) < 20;

  for (let y = 0; y < 1110; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x > 680 && y > 755) {
        const index = (y * width + x) * channels;
        if (isRed(data[index], data[index + 1], data[index + 2]) || isNearWhite(data[index], data[index + 1], data[index + 2])) {
          continue;
        }
      }
      const index = (y * width + x) * channels;
      const paint = (paintR, paintG, paintB) => {
        data[index] = paintR;
        data[index + 1] = paintG;
        data[index + 2] = paintB;
        data[index + 3] = 255;
      };
      const inside = inCircle(x, y);
      const hideProduct = inside && y < 920;
      const hideLeftoverTv = erasePodium && x < 640 && y >= 620 && y < 1110;
      const hideCopy = x >= 690 && y >= 70 && y <= 760;
      const hideTag = x >= 400 && x <= 660 && y >= 40 && y <= 440;
      const hideLeftJut = x < 200 && y >= 420 && y <= 860 && !inside;
      if (hideProduct || hideCopy || hideTag || hideLeftJut || hideLeftoverTv) {
        if (inside) paint(circleR, circleG, circleB);
        else paint(beigeR, beigeG, beigeB);
      }
    }
  }

  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outputPath);
  return outputPath;
}

function renderSukhumvitCopy(copy, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [path.join(root, "scripts/render-sukhumvit-copy.py")], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.stdin.write(JSON.stringify({ copy, output: outputPath }));
    child.stdin.end();
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`Sukhumvit copy renderer exited ${code}`));
    });
  });
}

async function sampleBeige(source) {
  const { data, info } = await sharp(source)
    .extract({ left: 36, top: 36, width: 90, height: 90 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let red = 0;
  let green = 0;
  let blue = 0;
  const count = data.length / info.channels;
  for (let index = 0; index < data.length; index += info.channels) {
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
  }
  const hex = (value) => Math.round(value / count).toString(16).padStart(2, "0");
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

function restyleStageSvg(beige) {
  return Buffer.from(`
    <svg width="1254" height="1254" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="680" height="1110" fill="${beige}"/>
      <rect x="680" y="0" width="574" height="780" fill="${beige}"/>
      <circle cx="${RESTYLE_CIRCLE.cx}" cy="${RESTYLE_CIRCLE.cy}" r="${RESTYLE_CIRCLE.r}" fill="#ffffff"/>
      <ellipse cx="${RESTYLE_CIRCLE.cx}" cy="${RESTYLE_CIRCLE.cy + RESTYLE_CIRCLE.r - 18}" rx="176" ry="18" fill="#ffffff"/>
    </svg>
  `);
}

function usesTvStudioPlate(templateFolder) {
  return templateFolder === "100MRGB96BS.ATM" || templateFolder === "OLED77C6PSA.S80TY";
}

function needsCleanStage(folder, templateFolder) {
  return (
    usesTvStudioPlate(templateFolder) ||
    SOUNDBAR_FOLDERS.has(folder) ||
    SPEAKER_FOLDERS.has(folder)
  );
}

function restyleCoverSvg(beige, copy, coverBottom) {
  const copyX = 700;
  const titleLines = wrapText(copy.title, 22, 2);
  const title = titleLines
    .map((line, index) => `<tspan x="${copyX}" dy="${index ? 46 : 0}">${escapeXml(line)}</tspan>`)
    .join("");
  const subtitleY = titleLines.length > 1 ? 430 : 396;
  const bulletStart = subtitleY + 48;
  const bullets = copy.bullets
    .slice(0, 5)
    .map((line, index) => `<text x="${copyX}" y="${bulletStart + index * 38}" class="spec">• ${escapeXml(line)}</text>`)
    .join("");
  return Buffer.from(`
    <svg width="1254" height="1254" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          ${studioFontFaceCss()}
          text { font-family: '${STUDIO_FONT}'; fill: #171717; }
          .eyebrow { font-size: 32px; font-weight: 700; }
          .title { font-size: 42px; font-weight: 700; }
          .subtitle { font-size: 24px; font-weight: 600; fill: #3c3530; }
          .spec { font-size: 23px; font-weight: 500; fill: #302a25; }
        </style>
      </defs>
      <rect width="1254" height="${coverBottom}" fill="${beige}"/>
      <circle cx="${RESTYLE_CIRCLE.cx}" cy="${RESTYLE_CIRCLE.cy}" r="${RESTYLE_CIRCLE.r}" fill="#ffffff"/>
      <ellipse cx="${RESTYLE_CIRCLE.cx}" cy="${RESTYLE_CIRCLE.cy + RESTYLE_CIRCLE.r - 18}" rx="176" ry="18" fill="#ffffff"/>
      <text x="${copyX}" y="292" class="eyebrow">${escapeXml(copy.eyebrow)}</text>
      <text x="${copyX}" y="348" class="title">${title}</text>
      <text x="${copyX}" y="${subtitleY}" class="subtitle">${escapeXml(copy.subtitle)}</text>
      ${bullets}
    </svg>
  `);
}

function isNearWhite(red, green, blue, threshold = 228) {
  return (
    red > threshold &&
    green > threshold &&
    blue > threshold &&
    Math.max(red, green, blue) - Math.min(red, green, blue) < 22
  );
}

async function cropToContent(input, maxWidth, maxHeight) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      if (isNearWhite(data[index], data[index + 1], data[index + 2], 240)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return sharp(input)
      .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer({ resolveWithObject: true });
  }
  const contentHeight = maxY - minY + 1;
  const padX = Math.round((maxX - minX + 1) * 0.1);
  const padTop = Math.round(contentHeight * 0.08);
  const padBottom = Math.round(contentHeight * 0.45);
  const left = Math.max(0, minX - padX);
  const top = Math.max(0, minY - padTop);
  const cropWidth = Math.min(width - left, maxX - minX + 1 + padX * 2);
  const cropHeight = Math.min(height - top, maxY - minY + 1 + padTop + padBottom);
  const cropped = await sharp(input).extract({ left, top, width: cropWidth, height: cropHeight }).png().toBuffer();
  return prepareLifestylePackshot(cropped, maxWidth, maxHeight);
}

async function prepareLifestylePackshot(input, maxWidth, maxHeight) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const index = pixel * channels;
    if (!isNearWhite(data[index], data[index + 1], data[index + 2], 250)) return;
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
  let cursor = 0;
  while (cursor < queue.length) {
    const pixel = queue[cursor];
    cursor += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      const i = p * channels;
      if (data[i + 3] === 0) continue;
      const n0 = data[(p - 1) * channels + 3] === 0;
      const n1 = data[(p + 1) * channels + 3] === 0;
      const n2 = data[(p - width) * channels + 3] === 0;
      const n3 = data[(p + width) * channels + 3] === 0;
      if (n0 || n1 || n2 || n3) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg > 230) {
          data[i + 3] = Math.max(0, Math.min(255, Math.round(((255 - avg) / 25) * 255)));
        }
      }
    }
  }
  return sharp(data, { raw: { width, height, channels } })
    .trim()
    .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function isolateProduct(input, maxWidth, maxHeight) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const index = pixel * channels;
    if (!isNearWhite(data[index], data[index + 1], data[index + 2])) return;
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

  let cursor = 0;
  while (cursor < queue.length) {
    const pixel = queue[cursor];
    cursor += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  for (let pass = 0; pass < 3; pass += 1) {
    const snapshot = Buffer.from(data);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * channels;
        if (snapshot[index + 3] === 0) continue;
        if (snapshot[index] < 198 || snapshot[index + 1] < 198 || snapshot[index + 2] < 198) continue;
        let nextToClear = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        if (!nextToClear) {
          const neighbors = [
            index - channels,
            index + channels,
            index - width * channels,
            index + width * channels,
          ];
          nextToClear = neighbors.some((neighbor) => neighbor >= 0 && neighbor + 3 < snapshot.length && snapshot[neighbor + 3] === 0);
        }
        if (nextToClear) data[index + 3] = 0;
      }
    }
  }

  let opaque = 0;
  for (let index = 3; index < data.length; index += channels) {
    if (data[index] > 16) opaque += 1;
  }
  if (opaque < pixelCount * 0.08) {
    return cropToContent(input, maxWidth, maxHeight);
  }

  return sharp(data, { raw: { width, height, channels } })
    .trim()
    .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function productImageComposites(imagePaths, placement = RESTYLE_CIRCLE, crops = []) {
  const count = imagePaths.length;
  const maxWidth =
    count === 1
      ? (placement.maxWidth ?? 430)
      : Math.min(250, Math.round((placement.maxWidth ?? 430) / 2) - 8);
  const maxHeight = placement.maxHeight ?? (count === 1 ? 430 : 320);
  const prepared = await Promise.all(
    imagePaths.map(async (relativePath, index) => {
      const filePath = path.join(root, "public", relativePath.replace(/^\//, ""));
      const crop = crops[index];
      let input = filePath;
      if (crop) {
        const metadata = await sharp(filePath).metadata();
        const left = Math.round(metadata.width * crop.left);
        const top = Math.round(metadata.height * crop.top);
        const width = Math.min(metadata.width - left, Math.round(metadata.width * crop.width));
        const height = Math.min(metadata.height - top, Math.round(metadata.height * crop.height));
        input = await sharp(filePath).extract({ left, top, width, height }).png().toBuffer();
      }
      if (placement.keepLightProduct) {
        return sharp(input)
          .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: false })
          .png()
          .toBuffer({ resolveWithObject: true });
      }
      return placement.lifestyle
        ? prepareLifestylePackshot(input, maxWidth, maxHeight)
        : isolateProduct(input, maxWidth, maxHeight);
    }),
  );
  const gap = 16;
  const totalWidth = prepared.reduce((sum, image) => sum + image.info.width, 0) + (prepared.length - 1) * gap;
  const centerX = placement.centerX ?? placement.cx;
  let left = centerX - Math.round(totalWidth / 2);
  return prepared.map((image) => {
    const top =
      placement.bottomY != null
        ? placement.bottomY - image.info.height
        : (placement.cy ?? RESTYLE_CIRCLE.cy) - Math.round(image.info.height / 2);
    const item = { input: image.data, left: Math.max(40, left), top: Math.max(160, top) };
    left += image.info.width + gap;
    return item;
  });
}

async function writeCanonicalPng(output, source, inputs) {
  await fsPromises.mkdir(path.dirname(output), { recursive: true });
  const pipeline = source
    ? sharp(source)
    : sharp({
        create: {
          width: 1254,
          height: 1254,
          channels: 4,
          background: { r: 243, g: 226, b: 204, alpha: 1 },
        },
      });
  await pipeline.composite(inputs).ensureAlpha().png().toFile(output);
  const metadata = await sharp(output).metadata();
  if (metadata.width !== 1254 || metadata.height !== 1254 || metadata.channels !== 4) {
    throw new Error(`Invalid output metadata for ${output}`);
  }
}

const campaignProducts = readCampaignProducts();
const catalogSources = readCatalogSources();
const knowledgeGuides = readKnowledgeGuides();
const report = [];

await fsPromises.mkdir(canonicalRoot, { recursive: true });
const studioFooter = await studioFooterOverlay();
const plateRoot = path.join(root, ".gen/Price list_Sep_V3/plates");
const saqPlateSource = findStudioSource("SAQ11A");
const tvPlateSource = findStudioSource("100MRGB96BS.ATM");
if (!saqPlateSource || !tvPlateSource) {
  throw new Error("Missing SAQ11A or 100MRGB96BS.ATM studio stills for empty plates");
}
const saqPlate = await writeStudioPlate(saqPlateSource, path.join(plateRoot, "saq11a-plate.png"));
const tvPlate = await writeStudioPlate(tvPlateSource, path.join(plateRoot, "tv-plate.png"), {
  erasePodium: true,
});
console.log(`plates  ${path.relative(root, saqPlate)}`);
console.log(`plates  ${path.relative(root, tvPlate)}`);
const restyleOnly = process.argv.includes("--restyle-only");
const onlyIndex = process.argv.indexOf("--only");
const onlyFolders = onlyIndex >= 0 ? process.argv[onlyIndex + 1]?.split(",") ?? [] : null;

function restylePlate(_templateFolder) {
  return saqPlate;
}

function grokScenePath(folder) {
  const candidates = [
    path.join(root, ".gen/Price list_Sep_V3/grok-image-2/scenes", `${slugModel(folder)}.png`),
    path.join(root, ".gen/Price list_Sep_V3/grok-image-2/scenes", `${folder}.png`),
  ];
  return candidates.find((candidate) => fileExists(candidate));
}

function isBeigeLike(red, green, blue, beige, threshold = 48) {
  return (
    Math.abs(red - beige[0]) < threshold &&
    Math.abs(green - beige[1]) < threshold &&
    Math.abs(blue - beige[2]) < threshold
  );
}

function isPromoRed(red, green, blue) {
  return red > 150 && green < 110 && blue < 110 && red - green > 60;
}

function isStagePixel(red, green, blue, beige, { keepLightProduct = false } = {}) {
  if (isBeigeLike(red, green, blue, beige) || isPromoRed(red, green, blue)) return true;
  if (keepLightProduct) return false;
  if (isNearWhite(red, green, blue, 200)) return true;
  const average = (red + green + blue) / 3;
  const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
  return average > 155 && chroma < 42;
}

function sampleCornerBeige(data, width, height, channels) {
  const sample = (x, y) => {
    const index = (y * width + x) * channels;
    return [data[index], data[index + 1], data[index + 2]];
  };
  const corners = [sample(8, 8), sample(width - 9, 8), sample(8, height - 9), sample(width - 9, height - 9)];
  const beige = [0, 0, 0];
  for (const color of corners) {
    beige[0] += color[0];
    beige[1] += color[1];
    beige[2] += color[2];
  }
  return [Math.round(beige[0] / 4), Math.round(beige[1] / 4), Math.round(beige[2] / 4)];
}

function keepLargestOpaqueComponents(data, width, height, channels, maxKeep) {
  const pixelCount = width * height;
  const labels = new Int32Array(pixelCount).fill(-1);
  const sizes = [];
  let label = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (labels[pixel] !== -1) continue;
      if (data[pixel * channels + 3] <= 16) {
        labels[pixel] = -2;
        continue;
      }
      const stack = [pixel];
      labels[pixel] = label;
      let size = 0;
      while (stack.length) {
        const current = stack.pop();
        size += 1;
        const currentX = current % width;
        const currentY = Math.floor(current / width);
        const neighbors = [
          [currentX - 1, currentY],
          [currentX + 1, currentY],
          [currentX, currentY - 1],
          [currentX, currentY + 1],
        ];
        for (const [nextX, nextY] of neighbors) {
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (labels[next] !== -1) continue;
          if (data[next * channels + 3] <= 16) {
            labels[next] = -2;
            continue;
          }
          labels[next] = label;
          stack.push(next);
        }
      }
      sizes[label] = size;
      label += 1;
    }
  }
  const ranked = sizes
    .map((size, index) => ({ index, size }))
    .sort((left, right) => right.size - left.size);
  const largest = ranked[0]?.size ?? 0;
  const keep = new Set(
    ranked.slice(0, maxKeep).filter((item) => item.size >= largest * 0.12).map((item) => item.index),
  );
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (!keep.has(labels[pixel])) data[pixel * channels + 3] = 0;
  }
}

function opaqueBounds(data, width, height, channels, padding = 6) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      if (data[index + 3] <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX <= minX || maxY <= minY) return null;
  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  return {
    left,
    top,
    width: Math.min(width - left, maxX - minX + 1 + padding * 2),
    height: Math.min(height - top, maxY - minY + 1 + padding * 2),
  };
}

async function isolateGrokProduct(scenePath, maxWidth, maxHeight, { keepLightProduct = false, protectScreen = false, maxComponents = 1 } = {}) {
  const { data, info } = await sharp(scenePath)
    .resize(1254, 1254, { fit: "cover", position: "left" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const beige = sampleCornerBeige(data, width, height, channels);
  const beigeIsWhite = isNearWhite(beige[0], beige[1], beige[2], 230);
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const index = pixel * channels;
    if (keepLightProduct && beigeIsWhite) return;
    if (!isStagePixel(data[index], data[index + 1], data[index + 2], beige, { keepLightProduct })) return;
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

  let cursor = 0;
  while (cursor < queue.length) {
    const pixel = queue[cursor];
    cursor += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  for (let pass = 0; pass < 8; pass += 1) {
    if (keepLightProduct && beigeIsWhite) break;
    const snapshot = Buffer.from(data);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = (y * width + x) * channels;
        if (snapshot[index + 3] === 0) continue;
        if (!isStagePixel(snapshot[index], snapshot[index + 1], snapshot[index + 2], beige, { keepLightProduct })) {
          continue;
        }
        const neighbors = [
          snapshot[((y * width + x - 1) * channels) + 3] === 0,
          snapshot[((y * width + x + 1) * channels) + 3] === 0,
          snapshot[(((y - 1) * width + x) * channels) + 3] === 0,
          snapshot[(((y + 1) * width + x) * channels) + 3] === 0,
        ];
        if (neighbors.some(Boolean)) data[index + 3] = 0;
      }
    }
  }

  if (!keepLightProduct && !protectScreen) {
    for (let index = 0; index < data.length; index += channels) {
      if (data[index + 3] === 0) continue;
      if (isStagePixel(data[index], data[index + 1], data[index + 2], beige)) {
        data[index + 3] = 0;
      }
    }
  } else if (protectScreen) {
    let productBottom = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * channels;
        if (data[index + 3] <= 16) continue;
        const average = (data[index] + data[index + 1] + data[index + 2]) / 3;
        const chroma = Math.max(data[index], data[index + 1], data[index + 2]) - Math.min(data[index], data[index + 1], data[index + 2]);
        if (average < 90 || chroma > 40) productBottom = Math.max(productBottom, y);
      }
    }
    for (let y = productBottom + 4; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * channels;
        if (data[index + 3] === 0) continue;
        if (isStagePixel(data[index], data[index + 1], data[index + 2], beige)) data[index + 3] = 0;
      }
    }
  }

  if (keepLightProduct) {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * channels;
        if (data[index + 3] === 0) continue;
        if (isBeigeLike(data[index], data[index + 1], data[index + 2], beige) || isNearWhite(data[index], data[index + 1], data[index + 2], 210)) {
          continue;
        }
        if (isBeigeLike(data[index], data[index + 1], data[index + 2], beige)) continue;
        const chroma = Math.max(data[index], data[index + 1], data[index + 2]) - Math.min(data[index], data[index + 1], data[index + 2]);
        if (chroma < 55) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX > minX && maxY > minY) {
      const screenHeight = maxY - minY + 1;
      const screenWidth = maxX - minX + 1;
      const centerX = Math.round((minX + maxX) / 2);
      const keepLeft = minX - Math.round(screenWidth * 0.12);
      const keepRight = maxX + Math.round(screenWidth * 0.12);
      const keepTop = minY - Math.round(screenHeight * 0.08);
      const keepBottom = maxY + Math.round(screenHeight * 1.25);
      const poleHalf = Math.max(48, Math.round(screenWidth * 0.18));
      const colorfulMask = new Uint8Array(width * height);
      const colorRadius = 22;
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const index = (y * width + x) * channels;
          if (data[index + 3] === 0) continue;
          const chroma = Math.max(data[index], data[index + 1], data[index + 2]) - Math.min(data[index], data[index + 1], data[index + 2]);
          if (chroma < 55) continue;
          for (let dy = -colorRadius; dy <= colorRadius; dy += 1) {
            for (let dx = -colorRadius; dx <= colorRadius; dx += 1) {
              if (dx * dx + dy * dy > colorRadius * colorRadius) continue;
              const nextX = x + dx;
              const nextY = y + dy;
              if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
              colorfulMask[nextY * width + nextX] = 1;
            }
          }
        }
      }
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * channels;
          if (data[index + 3] === 0) continue;
          const inScreen = x >= keepLeft && x <= keepRight && y >= keepTop && y <= maxY + Math.round(screenHeight * 0.05);
          const inStand = Math.abs(x - centerX) <= poleHalf && y > maxY && y <= keepBottom;
          if (!inScreen && !inStand) {
            data[index + 3] = 0;
            continue;
          }
          if (inScreen && isNearWhite(data[index], data[index + 1], data[index + 2], 210) && !colorfulMask[y * width + x]) {
            data[index + 3] = 0;
          }
        }
      }
    }
  } else {
    keepLargestOpaqueComponents(data, width, height, channels, maxComponents);
  }

  let opaque = 0;
  for (let index = 3; index < data.length; index += channels) {
    if (data[index] > 16) opaque += 1;
  }
  if (opaque < pixelCount * 0.012) {
    return cropToContent(scenePath, maxWidth, maxHeight);
  }

  const bounds = opaqueBounds(data, width, height, channels);
  const cropped = bounds
    ? await sharp(data, { raw: { width, height, channels } }).extract(bounds).png().toBuffer()
    : await sharp(data, { raw: { width, height, channels } }).png().toBuffer();

  return sharp(cropped)
    .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function grokProductComposites(scenePath, placement) {
  const maxWidth = placement.maxWidth ?? 430;
  const maxHeight = placement.maxHeight ?? 430;
  const isolated = await isolateGrokProduct(scenePath, maxWidth, maxHeight, {
    keepLightProduct: Boolean(placement.lifestyle) && maxHeight >= 600,
    protectScreen: Boolean(placement.lifestyle) && maxHeight < 600,
    maxComponents: placement.maxComponents ?? 1,
  });
  const centerX = placement.centerX ?? placement.cx;
  const top =
    placement.bottomY != null
      ? placement.bottomY - isolated.info.height
      : (placement.cy ?? RESTYLE_CIRCLE.cy) - Math.round(isolated.info.height / 2);
  return [
    {
      input: isolated.data,
      left: Math.max(40, centerX - Math.round(isolated.info.width / 2)),
      top: Math.max(160, top),
    },
  ];
}

for (const product of campaignProducts) {
  const folder = sourceFolder(product.model);
  const exactStudio = findStudioSource(folder);
  const templateFolder = restyleTemplates[folder];
  const templateSource = templateFolder ? findStudioSource(templateFolder) : undefined;
  const source = exactStudio ?? templateSource;
  if (!source) {
    throw new Error(`No August studio source for ${product.model}`);
  }

  const mode = exactStudio ? "reuse" : "restyle";
  if (onlyFolders?.length && !onlyFolders.includes(folder) && !onlyFolders.includes(templateFolder)) {
    continue;
  }
  const output = path.join(canonicalRoot, folder, `${folder}__Price-list_Sep_V3.png`);
  if (restyleOnly && mode === "reuse" && fileExists(output)) {
    report.push({
      model: product.model,
      folder,
      mode,
      price: product.monthlyPrice,
      source: path.relative(root, source),
    });
    console.log(`skip    ${folder}`);
    continue;
  }
  const inputs = [];
  const plate = mode === "restyle" ? restylePlate(templateFolder) : source;
  const priceComposition = await buildPriceComposites(plate, product.monthlyPrice);
  let baseSource = plate;

  if (mode === "restyle") {
    const sources = resolveSources(product, catalogSources);
    const extraImages = extraImageOverrides[product.model] ?? extraImageOverrides[folder] ?? [];
    const skipBundleExtras = folder.includes("S80TY") || folder.includes("S30A");
    const imagePaths = [
      ...new Set([
        sources[0].image,
        ...(skipBundleExtras ? [] : extraImages),
      ]),
    ];
    const copy = posterCopy(product, sources[0], knowledgeGuides);
    const copyOverlay = path.join(canonicalRoot, folder, `${folder}__copy.png`);
    await renderSukhumvitCopy(copy, copyOverlay);
    baseSource = plate;
    const placement = restylePlacement(templateFolder, folder);
    if (needsCleanStage(folder, templateFolder)) {
      const beige = await sampleBeige(plate);
      inputs.push({ input: restyleStageSvg(beige), left: 0, top: 0 });
    }
    const crop = restylePackshotCrops[folder];
    inputs.push(
      ...(await productImageComposites(
        imagePaths,
        placement,
        crop ? [crop] : [],
      )),
    );
    inputs.push({ input: copyOverlay, left: 0, top: 0 });
    const badge = promotionBadge(product);
    if (badge) {
      inputs.push({
        input: promotionTagOverlaySvg({
          ...tagPlacement(folder, templateFolder),
          ...badge,
        }),
        left: 0,
        top: 0,
      });
    }
  } else {
    const tagChange = promotionTagChanges.get(folder);
    if (tagChange) {
      inputs.push({ input: promotionTagOverlaySvg(tagChange), left: 0, top: 0 });
    }
  }

  inputs.push(...priceComposition.inputs);
  inputs.push({ input: studioFooter, left: 0, top: STUDIO_FOOTER_TOP });
  await writeCanonicalPng(output, baseSource, inputs);

  report.push({
    model: product.model,
    folder,
    mode,
    price: product.monthlyPrice,
    source: path.relative(root, source),
  });
  console.log(`${mode.padEnd(7)} ${folder}: ${Number(product.monthlyPrice).toLocaleString("en-US")} บาท`);
}

if (onlyFolders?.length) {
  console.log(`Generated ${report.length} selected ${campaign} images`);
} else {
  await fsPromises.writeFile(
    path.join(root, ".gen/Price list_Sep_V3/generation-report.json"),
    `${JSON.stringify({ campaign, products: report, omittedSeptemberModels }, null, 2)}\n`,
  );
  const reused = report.filter((row) => row.mode === "reuse").length;
  const restyled = report.filter((row) => row.mode === "restyle").length;
  const status =
    `# Promotion image status (Price list_Sep_V3)\n\n` +
    `- \`used/\`: ${report.length} September assets ready for website sync.\n` +
    `- ${reused} stills reuse the August studio original and only update the monthly price/tag.\n` +
    `- ${restyled} stills keep an August studio template and only swap the catalog packshot, copy, and monthly price.\n\n` +
    `## Used (${report.length})\n\n` +
    report.map((row) => `- \`${row.folder}\` (${row.mode})`).join("\n") +
    `\n\n## Removed because absent from September (${omittedSeptemberModels.length})\n\n` +
    omittedSeptemberModels.map((model) => `- \`${model}\``).join("\n") +
    "\n";
  await fsPromises.writeFile(path.join(root, ".gen/Price list_Sep_V3/STATUS.md"), status);
  console.log(`Generated ${report.length} canonical ${campaign} images (${reused} reused, ${restyled} restyled)`);
}
