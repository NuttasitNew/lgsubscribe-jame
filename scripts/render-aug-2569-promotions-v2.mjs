import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "output/promotions/aug-2569");
const cutoutDir = path.join(out, "cutouts");
const font = "Sukhumvit Set, Tahoma, sans-serif";

const products = {
  water: "public/images/products/official/puricare-wd516an-aslplmt.jpg",
  vacuum: "public/images/products/official/vacuum-a9t-ultra.jpg",
  dehumidifier: "public/images/products/lg-catalog/dd23gmwe1.jpg",
  washtower: "public/images/products/official/wt1410nheg/01-front.jpeg",
  waterBeige: "public/images/products/official/water-purifier-wd518an.jpg",
};

const cards = [
  { file: "01-water-purifier-v2.png", product: "water", model: "LG PuriCare WD516 / WD518", title: "น้ำสะอาด\nเริ่มเพียง", price: "149.-", sub: "รอบบิลแรก", highlight: "ลด 50% ต่ออีก 11 รอบบิล", detail: "เลือกสัญญา 5 หรือ 7 ปี | Visit / Self" },
  { file: "02-cordzero-ultra-v2.png", product: "vacuum", model: "LG CordZero A9T-ULTRA", title: "บ้านสะอาด\nเริ่มเพียง", price: "149.-", sub: "รอบบิลแรก", highlight: "ลด 50% ในรอบบิลที่ 2-3", detail: "สัญญา Subscribe 5 ปี แบบ Self" },
  { file: "03-dehumidifier-gift-v2.png", product: "dehumidifier", model: "LG PuriCare Dehumidifier 23L", title: "ลดชื้น\nรับของแถม", price: "149.-", sub: "รอบบิลแรก", highlight: "ฟรี! PuriCare AeroMini", detail: "ลด 50% ในรอบบิลที่ 2-3 | Visit / Self" },
  { file: "04-combo-10-percent-v2.png", product: "washtower", secondProduct: "waterBeige", model: "LG Subscribe Combo", title: "ซื้อเพิ่ม\nลดเพิ่ม", price: "10%", sub: "ส่วนลดคอมโบ", highlight: "ลูกค้าเดิม เพิ่มตั้งแต่ 1 เครื่อง", detail: "ลูกค้าใหม่ ซื้อพร้อมกันตั้งแต่ 2 เครื่อง" },
];

function esc(value) { return value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]); }
function textLines(value, x, y, size, fill, weight = 700, leading = 1.08) {
  return value.split("\n").map((line, i) => `<text x="${x}" y="${y + i * size * leading}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`).join("");
}

async function cutout(name, source) {
  const target = path.join(cutoutDir, `${name}.png`);
  const { data, info } = await sharp(path.join(root, source)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const seen = new Uint8Array(width * height);
  const queue = [];
  const isBackground = (pixel) => {
    const r = data[pixel * channels], g = data[pixel * channels + 1], b = data[pixel * channels + 2];
    return r > 244 && g > 244 && b > 244 && Math.max(r, g, b) - Math.min(r, g, b) < 10;
  };
  const visit = (x, y) => {
    const index = y * width + x;
    if (!seen[index] && isBackground(index)) { seen[index] = 1; queue.push(index); }
  };
  for (let x = 0; x < width; x++) { visit(x, 0); visit(x, height - 1); }
  for (let y = 0; y < height; y++) { visit(0, y); visit(width - 1, y); }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], x = index % width, y = Math.floor(index / width);
    if (x) visit(x - 1, y); if (x + 1 < width) visit(x + 1, y); if (y) visit(x, y - 1); if (y + 1 < height) visit(x, y + 1);
  }
  for (let index = 0; index < seen.length; index++) if (seen[index]) data[index * channels + 3] = 0;
  await sharp(data, { raw: { width, height, channels } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(target);
  return target;
}

function frame(card) {
  return Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1350" fill="#fff8f5" fill-opacity="0.76"/>
    <rect x="0" y="0" width="1080" height="165" fill="#9d0733"/>
    <text x="64" y="78" font-family="${font}" font-size="31" font-weight="700" fill="#ffffff">LG Subscribe</text>
    <text x="64" y="124" font-family="${font}" font-size="24" font-weight="500" fill="#ffdce8">${esc(card.model)}</text>
    ${textLines(card.title, 64, 275, 82, "#29171d")}
    <rect x="64" y="530" width="452" height="338" rx="42" fill="#9d0733"/>
    <text x="102" y="603" font-family="${font}" font-size="30" font-weight="600" fill="#ffdbe7">${esc(card.sub)}</text>
    <text x="96" y="751" font-family="${font}" font-size="158" font-weight="700" fill="#ffffff">${esc(card.price)}</text>
    <text x="102" y="817" font-family="${font}" font-size="31" font-weight="600" fill="#ffdbe7">${esc(card.highlight)}</text>
    <rect x="64" y="951" width="952" height="128" rx="30" fill="#ffffff" fill-opacity="0.96"/>
    ${textLines(card.detail, 100, 1017, 33, "#3b292e", 600, 1.1)}
    <rect x="64" y="1190" width="952" height="2" fill="#9d0733" fill-opacity="0.25"/>
    <text x="64" y="1242" font-family="${font}" font-size="26" font-weight="600" fill="#6e575f">โปรโมชันสิงหาคม 2569</text>
    <text x="64" y="1290" font-family="${font}" font-size="22" font-weight="500" fill="#6e575f">ราคาและเงื่อนไขอาจเปลี่ยนแปลงได้ โปรดตรวจสอบก่อนสั่งซื้อ</text>
  </svg>`);
}

await fs.mkdir(cutoutDir, { recursive: true });
const cutouts = {};
for (const [name, source] of Object.entries(products)) cutouts[name] = await cutout(name, source);

for (const card of cards) {
  const product = await sharp(cutouts[card.product]).resize(card.secondProduct ? 450 : 570, 690, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const layers = [{ input: frame(card), top: 0, left: 0 }, { input: product, top: card.secondProduct ? 250 : 250, left: card.secondProduct ? 584 : 486 }];
  if (card.secondProduct) {
    const second = await sharp(cutouts[card.secondProduct]).resize(240, 330, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    layers.push({ input: second, top: 535, left: 455 });
  }
  await sharp(path.join(out, "ai-background-v2.png")).resize(1080, 1350, { fit: "cover" }).composite(layers).png({ compressionLevel: 9 }).toFile(path.join(out, card.file));
}
