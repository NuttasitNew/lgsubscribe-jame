import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = "/Users/nuttasit/lg-jame";
const sourceRoot = path.join(
  root,
  "public/images/products/promotions/aug-v3",
);
const outputRoot = path.join(root, ".gen/Price list_Sep_V3/unused");

const previews = [
  {
    model: "SAQ11A",
    source: "saq11a__price-list-aug-v3.png",
    price: "649",
    card: { x: 681, y: 871, width: 464, height: 128 },
  },
  {
    model: "SAQ13A",
    source: "saq13a__price-list-aug-v3.png",
    price: "699",
    card: { x: 683, y: 864, width: 468, height: 126 },
  },
  {
    model: "SAQ18B",
    source: "saq18b__price-list-aug-v3.png",
    price: "849",
    card: { x: 687, y: 865, width: 471, height: 131 },
  },
  {
    model: "SAQ24B",
    source: "saq24b__price-list-aug-v3.png",
    price: "949",
    card: { x: 670, y: 858, width: 489, height: 128 },
  },
  {
    model: "F2520RNTB.AEBPETH",
    source: "f2520rntb-aebpeth__price-list-aug-v3.png",
    price: "699",
    card: { x: 656, y: 856, width: 482, height: 114 },
  },
  {
    model: "GC-G24FFQKB.AEEPLM1",
    source: "gc-g24ffqkb-aeeplm1__price-list-aug-v3.png",
    price: "1049",
    card: { x: 693, y: 861, width: 480, height: 120 },
  },
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

function getPriceLayout(price, card) {
  const numericPrice = Number(String(price).replaceAll(",", ""));
  const digitCount = String(Math.trunc(numericPrice)).length;

  if (!Number.isFinite(numericPrice) || ![3, 4].includes(digitCount)) {
    throw new Error(`Unsupported monthly price: ${price}`);
  }

  const isFourDigits = digitCount === 4;

  return {
    formattedPrice: numericPrice.toLocaleString("en-US"),
    digitCount,
    priceFontSize: isFourDigits ? 82 : 94,
  };
}

function cardOverlaySvg(card) {
  return Buffer.from(`
    <svg width="1254" height="1254" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${card.x}"
        y="${card.y}"
        width="${card.width}"
        height="${card.height}"
        rx="${Math.floor(card.height / 2)}"
        fill="#ffffff"
      />
    </svg>
  `);
}

async function renderText(text, fontSize, fontWeight) {
  const svg = Buffer.from(`
    <svg width="700" height="150" xmlns="http://www.w3.org/2000/svg">
      <text
        x="10"
        y="115"
        fill="#e7242b"
        font-family="Thonburi, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
      >${escapeXml(text)}</text>
    </svg>
  `);

  return sharp(svg).trim().png().toBuffer({ resolveWithObject: true });
}

async function priceComposites(preview) {
  const { card } = preview;
  const layout = getPriceLayout(preview.price, card);
  const price = await renderText(
    `${layout.formattedPrice}.-`,
    layout.priceFontSize,
    700,
  );
  const month = await renderText("/เดือน", 34, 600);
  const horizontalPadding = 28;
  const gap = 6;
  const contentWidth = price.info.width + gap + month.info.width;
  const availableWidth = card.width - horizontalPadding * 2;

  if (contentWidth > availableWidth) {
    throw new Error(
      `Price content exceeds white card for ${preview.model}: ${contentWidth}px > ${availableWidth}px`,
    );
  }

  const contentLeft = card.x + Math.round((card.width - contentWidth) / 2);
  const priceTop = card.y + Math.round((card.height - price.info.height) / 2);
  const monthTop = priceTop + 10;

  return {
    inputs: [
      { input: cardOverlaySvg(card), left: 0, top: 0 },
      { input: price.data, left: contentLeft, top: priceTop },
      {
        input: month.data,
        left: contentLeft + price.info.width + gap,
        top: monthTop,
      },
    ],
    metrics: {
      ...layout,
      contentWidth,
      availableWidth,
      leftPadding: contentLeft - card.x,
      rightPadding: card.x + card.width - (contentLeft + contentWidth),
      gap,
    },
  };
}

await fs.mkdir(outputRoot, { recursive: true });

for (const preview of previews) {
  const source = path.join(sourceRoot, preview.source);
  const modelRoot = path.join(outputRoot, preview.model);
  const output = path.join(
    modelRoot,
    `${preview.model}__Price-list_Sep_V3.png`,
  );

  await fs.mkdir(modelRoot, { recursive: true });
  const composition = await priceComposites(preview);
  await sharp(source)
    .composite(composition.inputs)
    .ensureAlpha()
    .png()
    .toFile(output);

  const { metrics } = composition;
  console.log(
    `${output} (${metrics.digitCount} digits, padding=${metrics.leftPadding}/${metrics.rightPadding}px, gap=${metrics.gap}px)`,
  );
}
