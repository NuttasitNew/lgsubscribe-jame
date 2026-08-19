import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "output/promotions/aug-2569");
const background = path.join(out, "ai-background.png");
const font = "Sukhumvit Set, Tahoma, sans-serif";

const offers = [
  {
    file: "01-water-purifier.png",
    kicker: "PuriCare Water Purifier",
    title: "น้ำสะอาด เริ่มง่าย",
    price: "149.-",
    priceLabel: "เริ่มเพียง",
    priceNote: "รอบบิลแรก",
    detail: "WD516 / WD518\nลด 50% ต่ออีก 11 รอบบิล",
    terms: "สัญญา Subscribe 5 หรือ 7 ปี | Visit / Self\nราคา 149 บาทเฉพาะรอบบิลแรก",
    product: "public/images/products/official/puricare-wd516an-aslplmt.jpg",
  },
  {
    file: "02-cordzero-ultra.png",
    kicker: "LG CordZero A9T-ULTRA",
    title: "บ้านสะอาด เริ่มที่",
    price: "149.-",
    priceLabel: "เริ่มเพียง",
    priceNote: "รอบบิลแรก",
    detail: "All-in-One Tower\nลด 50% ในรอบบิลที่ 2-3",
    terms: "สัญญา Subscribe 5 ปี แบบ Self\nจาก 749 บาท/เดือน หลังโปรโมชัน",
    product: "public/images/products/official/vacuum-a9t-ultra.jpg",
  },
  {
    file: "03-dehumidifier-gift.png",
    kicker: "PuriCare Dehumidifier 23L",
    title: "ลดชื้น รับฟรี!\nเครื่องฟอกอากาศ",
    price: "149.-",
    priceLabel: "เริ่มเพียง",
    priceNote: "รอบบิลแรก",
    detail: "DD23GMWE1 + AeroMini\nลด 50% ในรอบบิลที่ 2-3",
    terms: "สัญญา Subscribe 5 ปี | Visit / Self\nของแถมจัดส่งพร้อมสินค้าหลัก",
    product: "public/images/products/lg-catalog/dd23gmwe1.jpg",
  },
  {
    file: "04-combo-10-percent.png",
    kicker: "Special Combo Promotion",
    title: "เพิ่มเครื่อง ลดเพิ่ม",
    price: "10%",
    priceLabel: "รับส่วนลด",
    priceNote: "ส่วนลดคอมโบ",
    detail: "ลูกค้าเดิม: เพิ่มตั้งแต่ 1 เครื่อง\nลูกค้าใหม่: ซื้อพร้อมกันตั้งแต่ 2 เครื่อง",
    terms: "เฉพาะสินค้า Subscribe | ต้องผ่านเงื่อนไขคอมโบ\nตรวจสอบรุ่นและสัญญาก่อนสั่งซื้อ",
    product: "public/images/products/official/wt1410nheg/01-front.jpeg",
    secondaryProduct: "public/images/products/official/water-purifier-wd518an.jpg",
  },
];

function esc(value) {
  return value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
}

function lines(value, x, y, size, weight, fill, leading = 1.22) {
  return value.split("\n").map((line, index) =>
    `<text x="${x}" y="${y + index * size * leading}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`
  ).join("");
}

function overlay(offer) {
  return Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1350" fill="#fff9f6" fill-opacity="0.81"/>
    <rect x="0" y="0" width="1080" height="204" fill="#9d0733"/>
    <rect x="60" y="56" width="188" height="50" rx="25" fill="#ffffff" fill-opacity="0.16"/>
    <text x="84" y="89" font-family="${font}" font-size="24" font-weight="700" fill="#ffffff">LG Subscribe</text>
    <text x="60" y="151" font-family="${font}" font-size="25" font-weight="600" fill="#ffffff">${esc(offer.kicker)}</text>
    ${lines(offer.title, 60, 294, 62, 700, "#24191c")}
    <rect x="60" y="474" width="410" height="236" rx="32" fill="#9d0733"/>
    <text x="92" y="535" font-family="${font}" font-size="27" font-weight="600" fill="#ffe5ed">${esc(offer.priceLabel)}</text>
    <text x="86" y="638" font-family="${font}" font-size="112" font-weight="700" fill="#ffffff">${esc(offer.price)}</text>
    <text x="94" y="685" font-family="${font}" font-size="27" font-weight="600" fill="#ffe5ed">${esc(offer.priceNote)}</text>
    ${lines(offer.detail, 60, 794, 34, 700, "#24191c")}
    <rect x="60" y="1028" width="960" height="174" rx="28" fill="#ffffff" fill-opacity="0.94"/>
    ${lines(offer.terms, 92, 1091, 27, 500, "#4d3a40", 1.38)}
    <rect x="60" y="1244" width="960" height="2" fill="#9d0733" fill-opacity="0.25"/>
    <text x="60" y="1293" font-family="${font}" font-size="22" font-weight="600" fill="#6c555e">โปรโมชันเดือนสิงหาคม 2569 | ราคาและเงื่อนไขอาจเปลี่ยนแปลงได้</text>
  </svg>`);
}

async function productLayer(product, width, height) {
  return sharp(path.join(root, product))
    .resize({ width, height, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
}

for (const offer of offers) {
  const layers = [
    { input: overlay(offer), top: 0, left: 0 },
    { input: await productLayer(offer.product, offer.secondaryProduct ? 360 : 520, offer.secondaryProduct ? 480 : 610), top: offer.secondaryProduct ? 416 : 350, left: offer.secondaryProduct ? 570 : 505 },
  ];
  if (offer.secondaryProduct) {
    layers.push({ input: await productLayer(offer.secondaryProduct, 250, 360), top: 630, left: 470 });
  }
  await sharp(background)
    .resize(1080, 1350, { fit: "cover" })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, offer.file));
}
