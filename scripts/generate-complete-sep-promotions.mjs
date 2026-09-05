#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaignModule = path.join(root, "lib/sep-subscription-campaign.ts");
const catalogModule = path.join(root, "lib/catalog-products.ts");
const stagingRoot = path.join(root, ".gen/Price list_Sep_V3/complete");
const reportPath = path.join(root, ".gen/Price list_Sep_V3/complete-generation-report.json");
const logoPath = path.join(root, "public/brand/lg-subscribe-logo-red.png");

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

function parseArrayLiteral(filePath, variableName) {
  const source = ts.createSourceFile(
    filePath,
    requireText(filePath),
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

function requireText(filePath) {
  return ts.sys.readFile(filePath, "utf8");
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
    const value = property.initializer;
    const record = { key };
    for (const field of value.properties.filter(ts.isPropertyAssignment)) {
      const name = field.name.text ?? field.name.getText(source);
      record[name] = literalValue(field.initializer);
    }
    record.officialModel ??= key;
    return record;
  });
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
    throw new Error(`Ambiguous catalog sources for ${product.model}: ${unique.map((x) => x.key).join(", ")}`);
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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanText(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replaceAll("รบั ประกนั", "รับประกัน")
    .replaceAll("ผลติ ภณั ฑ์", "ผลิตภัณฑ์")
    .replaceAll("กวา้ ง", "กว้าง")
    .replaceAll("สงู", "สูง")
    .replaceAll("ลกึ", "ลึก")
    .replaceAll("ส ี", "สี")
    .replaceAll("พน้ื ทก่ี ารใชง้ าน", "พื้นที่การใช้งาน")
    .trim();
}

function wrapText(value, maxUnits, maxLines) {
  const words = cleanText(value).split(" ");
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
  if (words.join(" ").length > lines.join(" ").length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:]?$/, "")}…`;
  }
  return lines;
}

function promotionBadge(product) {
  const text = cleanText(product.promotions.join(" | "));
  if (!text) return null;
  const discountMonths = text.match(/50%\s*(\d+)\s*เดือน/i)?.[1];
  const advanceBills = text.match(/50%\s*(\d+)\s*บิล/i)?.[1];
  const gift = text.match(/แถมฟรี\s*([^|]+)/)?.[1]?.trim();
  if (text.includes("99.-")) return { title: "โปรพิเศษ 99.-", subtitle: "รอบบิลที่ 1-9", gift };
  if (text.includes("149.-")) {
    return {
      title: "เริ่มต้น 149.-",
      subtitle: discountMonths ? `และลด 50% ${discountMonths} เดือน` : "รอบบิลแรก",
      gift,
    };
  }
  if (advanceBills) return { title: "ลด 50%", subtitle: `${advanceBills} รอบบิลแรก`, gift };
  return { title: "โปรโมชั่นเดือนนี้", subtitle: wrapText(text, 22, 1)[0], gift };
}

function badgeSvg(badge) {
  if (!badge) return "";
  const gift = badge.gift ? `<text x="1020" y="257" text-anchor="middle" class="tag-gift">แถมฟรี ${escapeXml(badge.gift)}</text>` : "";
  return `
    <line x1="1020" y1="0" x2="1020" y2="72" stroke="#9a9a9a" stroke-width="3"/>
    <circle cx="1020" cy="78" r="8" fill="#fff" stroke="#9a9a9a" stroke-width="3"/>
    <path d="M914 82 H1126 V275 Q1020 327 914 275 Z" fill="#c81818" filter="url(#shadow)"/>
    <text x="1020" y="132" text-anchor="middle" class="tag-small">promotion</text>
    <text x="1020" y="182" text-anchor="middle" class="tag-title">${escapeXml(badge.title)}</text>
    <text x="1020" y="222" text-anchor="middle" class="tag-sub">${escapeXml(badge.subtitle)}</text>
    ${gift}
  `;
}

async function productImageComposites(imagePaths) {
  const count = imagePaths.length;
  const maxWidth = count === 1 ? 510 : 285;
  const maxHeight = count === 1 ? 500 : 360;
  const prepared = await Promise.all(
    imagePaths.map(async (relativePath) => {
      const filePath = path.join(root, "public", relativePath);
      const { data, info } = await sharp(filePath)
        .trim({ background: "#ffffff", threshold: 8 })
        .resize({ width: maxWidth, height: maxHeight, fit: "inside", withoutEnlargement: false })
        .png()
        .toBuffer({ resolveWithObject: true });
      return { data, info, relativePath };
    }),
  );
  const totalWidth = prepared.reduce((sum, image) => sum + image.info.width, 0) + (count - 1) * 8;
  let left = 328 - Math.round(totalWidth / 2);
  return prepared.map((image) => {
    const top = 360 + Math.round((500 - image.info.height) / 2);
    const item = { input: image.data, left, top };
    left += image.info.width + 8;
    return item;
  });
}

async function renderText(text, fontSize, fontWeight) {
  return sharp(
    Buffer.from(`<svg width="760" height="170" xmlns="http://www.w3.org/2000/svg"><text x="10" y="130" fill="#c81818" font-family="Thonburi, Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(text)}</text></svg>`),
  )
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function priceComposites(price) {
  const formatted = Number(price).toLocaleString("en-US");
  let priceSize = formatted.length >= 5 ? 72 : formatted.length >= 4 ? 82 : 94;
  let priceText = await renderText(`${formatted}.-`, priceSize, 700);
  const monthText = await renderText("/เดือน", 34, 600);
  const gap = 6;
  const pill = { x: 700, y: 884, width: 470, height: 122 };
  const available = pill.width - 48;
  while (priceText.info.width + gap + monthText.info.width > available && priceSize > 58) {
    priceSize -= 4;
    priceText = await renderText(`${formatted}.-`, priceSize, 700);
  }
  const contentWidth = priceText.info.width + gap + monthText.info.width;
  const left = pill.x + Math.round((pill.width - contentWidth) / 2);
  const priceTop = pill.y + Math.round((pill.height - priceText.info.height) / 2);
  return {
    inputs: [
      { input: priceText.data, left, top: priceTop },
      {
        input: monthText.data,
        left: left + priceText.info.width + gap,
        top: priceTop + Math.max(7, Math.round(priceText.info.height * 0.12)),
      },
    ],
    metrics: {
      pill,
      priceSize,
      contentWidth,
      leftPadding: left - pill.x,
      rightPadding: pill.x + pill.width - (left + contentWidth),
      gap,
    },
  };
}

function backgroundSvg(product, source, badge) {
  // Keep every line inside the 510px text column. Thai glyphs are wider than
  // Latin glyphs, so the conservative unit limit prevents right-edge clipping.
  const descriptionLines = wrapText(source.description, 29, 4);
  const details = cleanText(product.details).split("|").map(cleanText).filter(Boolean);
  const specLines = details
    .flatMap((line) => wrapText(line, 31, 2))
    .slice(0, 3);
  const description = descriptionLines
    .map((line, index) => `<tspan x="700" dy="${index ? 35 : 0}">${escapeXml(line)}</tspan>`)
    .join("");
  const specs = specLines
    .map((line, index) => `<text x="716" y="${670 + index * 38}" class="spec">• ${escapeXml(line)}</text>`)
    .join("");
  return Buffer.from(`
    <svg width="1254" height="1254" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf9"/><stop offset="1" stop-color="#ead8bd"/></linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#563716" flood-opacity=".22"/></filter>
        <style>
          text { font-family: Thonburi, Arial, sans-serif; fill: #171717; }
          .eyebrow { font-size: 24px; font-weight: 700; fill: #b70f18; letter-spacing: 2px; }
          .title { font-size: 38px; font-weight: 700; }
          .model { font-size: 25px; font-weight: 700; fill: #5a5149; }
          .desc { font-size: 25px; font-weight: 400; fill: #302a25; }
          .spec { font-size: 22px; font-weight: 500; fill: #302a25; }
          .tag-small { font-size: 18px; fill: #fff; }
          .tag-title { font-size: 31px; font-weight: 700; fill: #fff; }
          .tag-sub { font-size: 19px; font-weight: 600; fill: #fff; }
          .tag-gift { font-size: 16px; font-weight: 600; fill: #fff; }
          .start { font-size: 35px; font-weight: 700; fill: #fff; }
          .foot { font-size: 22px; font-weight: 600; fill: #fff; }
        </style>
      </defs>
      <rect width="1254" height="1254" fill="url(#bg)"/>
      <circle cx="310" cy="566" r="292" fill="#fff" opacity=".92"/>
      <circle cx="108" cy="170" r="120" fill="#fff" opacity=".42"/>
      <circle cx="1200" cy="600" r="200" fill="#fff" opacity=".28"/>
      ${badgeSvg(badge)}
      <text x="700" y="365" class="eyebrow">${escapeXml(product.category)}</text>
      <text x="700" y="425" class="title">LG Subscribe</text>
      <text x="700" y="468" class="model">${escapeXml(product.model)}</text>
      <text x="700" y="525" class="desc">${description}</text>
      ${specs}
      <rect x="650" y="820" width="560" height="236" rx="34" fill="#c81818" filter="url(#shadow)"/>
      <text x="935" y="872" text-anchor="middle" class="start">เริ่มต้น</text>
      <rect x="700" y="884" width="470" height="122" rx="61" fill="#fff"/>
      <rect x="0" y="1090" width="1254" height="164" fill="#c81818"/>
      <text x="72" y="1160" class="foot">LG Subscribe</text>
      <text x="1182" y="1160" text-anchor="end" class="foot">ส่งฟรีทั่วประเทศ*  |  รับประกันตลอดสัญญา*</text>
      <text x="72" y="1208" class="foot" style="font-size:17px;font-weight:400">*เงื่อนไขเป็นไปตามสัญญาและพื้นที่ให้บริการของ LG</text>
    </svg>
  `);
}

const campaignProducts = readCampaignProducts();
const catalogSources = readCatalogSources();
const report = [];
await fs.mkdir(stagingRoot, { recursive: true });
const logo = await sharp(logoPath).resize({ width: 390 }).png().toBuffer({ resolveWithObject: true });

for (const product of campaignProducts) {
  const sources = resolveSources(product, catalogSources);
  const primary = sources[0];
  const imagePaths = [
    ...sources.map((source) => source.image),
    ...(extraImageOverrides[product.model] ?? []),
  ];
  const uniqueImages = [...new Set(imagePaths)];
  const images = await productImageComposites(uniqueImages);
  const badge = promotionBadge(product);
  const price = await priceComposites(product.monthlyPrice);
  const folder = sourceFolder(product.model);
  const modelRoot = path.join(stagingRoot, folder);
  const output = path.join(modelRoot, `${folder}__Price-list_Sep_V3.png`);
  await fs.mkdir(modelRoot, { recursive: true });
  await sharp(backgroundSvg(product, primary, badge))
    .composite([
      { input: logo.data, left: 52, top: 54 },
      ...images,
      ...price.inputs,
    ])
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toFile(output);

  report.push({
    campaignModel: product.model,
    sourceFolder: folder,
    monthlyPrice: product.monthlyPrice,
    sourcePage: product.sourcePage,
    catalogSources: sources.map((source) => ({
      key: source.key,
      officialModel: source.officialModel,
      officialUrl: source.officialUrl,
      image: source.image,
    })),
    extraImages: extraImageOverrides[product.model] ?? [],
    output: path.relative(root, output),
    priceMetrics: price.metrics,
  });
  console.log(`${product.model} -> ${path.relative(root, output)}`);
}

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated ${report.length} complete September promotion stills`);
