import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "output/promotions/aug-2569");
const font = "Sukhumvit Set, Tahoma, sans-serif";
const cutout = (name) => path.join(out, "cutouts", `${name}.png`);

const sheets = [
  {
    file: "05-water-purifier-sales-sheet.png",
    product: "water",
    headline: "บริการและประกันนาน 7 ปี",
    ribbon: "เริ่ม 149.- รอบบิลแรก",
    name: "เครื่องกรองน้ำ LG PuriCare WD516 / WD518",
    feature: "เลือกได้หลายสี | Visit และ Self",
    rows: [["5 ปี", "Visit ผู้เชี่ยวชาญเข้าให้บริการ", "799.-"], ["5 ปี", "Self บริการด้วยตนเอง", "699.-"], ["7 ปี", "Visit ผู้เชี่ยวชาญเข้าให้บริการ", "599.-"], ["7 ปี", "Self บริการด้วยตนเอง", "499.-"]],
    promo: "ลด 50% รอบบิลที่ 2-12",
    service: "Visit: ผู้เชี่ยวชาญเข้าบำรุงรักษาและเปลี่ยนอะไหล่ตามรอบบริการทุก 6 เดือน",
    self: "Self: จัดส่งอะไหล่ให้เปลี่ยนด้วยตนเองตามรอบบริการทุก 6 เดือน",
    date: "โปรโมชัน 12-31 ส.ค. 2569",
  },
  {
    file: "06-washtower-sales-sheet.png",
    product: "washtower",
    headline: "WashTower ซัก 14 กก. / อบ 10 กก.",
    ribbon: "เริ่ม 149.- รอบบิลแรก",
    name: "LG WashTower รุ่น WT1410NHEG",
    feature: "รับประกันมอเตอร์และคอมเพรสเซอร์ 10 ปี",
    rows: [["5 ปี", "Visit ผู้เชี่ยวชาญเข้าให้บริการ", "1,599.-"], ["5 ปี", "Self บริการด้วยตนเอง", "1,499.-"], ["6 ปี", "Visit ผู้เชี่ยวชาญเข้าให้บริการ", "1,399.-"], ["6 ปี", "Self บริการด้วยตนเอง", "1,299.-"]],
    promo: "ลด 50% รอบบิลที่ 2-12",
    service: "Visit: ผู้เชี่ยวชาญเข้าดูแลตามรอบบริการทุก 12 เดือน",
    self: "Self: จัดส่งอะไหล่ให้เปลี่ยนด้วยตนเองตามรอบบริการทุก 12 เดือน",
    date: "โปรโมชัน 11-31 ส.ค. 2569",
  },
];

const esc = (v) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

function priceRow([years, label, price], y) {
  return `<circle cx="648" cy="${y + 50}" r="48" fill="#c7003d"/>
    <text x="648" y="${y + 44}" text-anchor="middle" font-family="${font}" font-size="22" font-weight="700" fill="#fff">สัญญา</text>
    <text x="648" y="${y + 76}" text-anchor="middle" font-family="${font}" font-size="36" font-weight="700" fill="#fff">${esc(years)}</text>
    <rect x="711" y="${y + 6}" width="300" height="88" rx="26" fill="#fff" fill-opacity="0.97"/>
    <text x="738" y="${y + 34}" font-family="${font}" font-size="21" font-weight="600" fill="#251b1d">${esc(label)}</text>
    <text x="738" y="${y + 78}" font-family="${font}" font-size="47" font-weight="700" fill="#c7003d">${esc(price)}</text>
    <text x="940" y="${y + 75}" font-family="${font}" font-size="21" font-weight="600" fill="#c7003d">/เดือน</text>`;
}

function overlay(sheet) {
  return Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1350" fill="#f5e6d8" fill-opacity="0.18"/>
    <text x="540" y="83" text-anchor="middle" font-family="${font}" font-size="48" font-weight="700" fill="#ffffff" stroke="#968b85" stroke-opacity="0.35" stroke-width="2">${esc(sheet.headline)}</text>
    <rect x="255" y="119" width="570" height="75" rx="37" fill="#c7003d"/>
    <text x="540" y="170" text-anchor="middle" font-family="${font}" font-size="41" font-weight="700" fill="#ffffff">${esc(sheet.ribbon)}</text>
    <text x="300" y="256" text-anchor="middle" font-family="${font}" font-size="30" font-weight="600" fill="#2c2320">${esc(sheet.name)}</text>
    <text x="300" y="296" text-anchor="middle" font-family="${font}" font-size="23" font-weight="500" fill="#473c38">${esc(sheet.feature)}</text>
    ${sheet.rows.map((row, i) => priceRow(row, 320 + i * 122)).join("")}
    <rect x="606" y="828" width="405" height="62" rx="22" fill="#c7003d"/>
    <text x="808" y="869" text-anchor="middle" font-family="${font}" font-size="28" font-weight="700" fill="#fff">${esc(sheet.promo)}</text>
    <rect x="0" y="1010" width="1080" height="340" fill="#fff"/>
    <rect x="64" y="1063" width="13" height="83" rx="6" fill="#c7003d"/>
    <text x="102" y="1095" font-family="${font}" font-size="31" font-weight="700" fill="#2b2020">บริการตามแผนสัญญา</text>
    <text x="102" y="1143" font-family="${font}" font-size="24" font-weight="500" fill="#342b29">${esc(sheet.service)}</text>
    <text x="102" y="1194" font-family="${font}" font-size="24" font-weight="500" fill="#342b29">${esc(sheet.self)}</text>
    <rect x="64" y="1243" width="952" height="2" fill="#c7003d" fill-opacity="0.25"/>
    <text x="64" y="1285" font-family="${font}" font-size="22" font-weight="600" fill="#5e514d">${esc(sheet.date)} | ราคาและเงื่อนไขอาจเปลี่ยนแปลงได้ โปรดตรวจสอบก่อนสั่งซื้อ</text>
  </svg>`);
}

for (const sheet of sheets) {
  const product = await sharp(cutout(sheet.product)).resize(450, 650, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(path.join(out, "ai-podium-background.png")).resize(1080, 1350, { fit: "cover" })
    .composite([{ input: overlay(sheet), top: 0, left: 0 }, { input: product, top: 343, left: 88 }])
    .png({ compressionLevel: 9 }).toFile(path.join(out, sheet.file));
}
