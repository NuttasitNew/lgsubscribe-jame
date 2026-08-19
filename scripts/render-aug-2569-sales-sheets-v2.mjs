import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "output/promotions/aug-2569");
const font = "Sukhumvit Set, Tahoma, sans-serif";
const cutout = (name) => path.join(out, "cutouts", `${name}.png`);

const sheets = [
  {
    file: "05-water-purifier-sales-sheet-v2.png", product: "water", top: "เครื่องกรองน้ำ LG PuriCare WD516 / WD518", detail: "สัญญาสูงสุด 7 ปี | Visit และ Self", rows: [["5 ปี", "Visit", "799.-"], ["5 ปี", "Self", "699.-"], ["7 ปี", "Visit", "599.-"], ["7 ปี", "Self", "499.-"]], promo: "ลด 50% รอบบิลที่ 2-12", date: "12-31 ส.ค. 2569",
  },
  {
    file: "06-washtower-sales-sheet-v2.png", product: "washtower", top: "LG WashTower ซัก 14 กก. / อบ 10 กก.", detail: "รุ่น WT1410NHEG\nรับประกันมอเตอร์และคอมเพรสเซอร์ 10 ปี", rows: [["5 ปี", "Visit", "1,599.-"], ["5 ปี", "Self", "1,499.-"], ["6 ปี", "Visit", "1,399.-"], ["6 ปี", "Self", "1,299.-"]], promo: "ลด 50% รอบบิลที่ 2-12", date: "11-31 ส.ค. 2569",
  },
];
const esc = (v) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
function centeredLines(value, x, y, size) { return value.split(/\n/).map((line, i) => `<text x="${x}" y="${y + i * 34}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="600" fill="#392d2a">${esc(line)}</text>`).join(""); }

function row([years, service, price], y) {
  return `<circle cx="657" cy="${y + 44}" r="43" fill="#c7003d"/>
  <text x="657" y="${y + 34}" text-anchor="middle" font-family="${font}" font-size="19" font-weight="700" fill="#fff">สัญญา</text>
  <text x="657" y="${y + 68}" text-anchor="middle" font-family="${font}" font-size="37" font-weight="700" fill="#fff">${esc(years)}</text>
  <rect x="716" y="${y + 4}" width="300" height="80" rx="23" fill="#fff"/>
  <text x="744" y="${y + 37}" font-family="${font}" font-size="27" font-weight="700" fill="#332927">${service === "Visit" ? "Visit Service" : "Self Service"}</text>
  <text x="744" y="${y + 75}" font-family="${font}" font-size="49" font-weight="700" fill="#c7003d">${esc(price)}</text>
  <text x="943" y="${y + 73}" font-family="${font}" font-size="20" font-weight="600" fill="#c7003d">/เดือน</text>`;
}

function overlay(sheet) {
  return Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1080" fill="#f4e3d7" fill-opacity="0.12"/>
    <text x="540" y="75" text-anchor="middle" font-family="${font}" font-size="44" font-weight="700" fill="#ffffff" stroke="#8f817b" stroke-opacity="0.33" stroke-width="2">${esc(sheet.top)}</text>
    <rect x="136" y="107" width="808" height="148" rx="64" fill="#c7003d"/>
    <text x="540" y="194" text-anchor="middle" font-family="${font}" font-size="71" font-weight="700" fill="#ffffff">เริ่มเพียง 149.-</text>
    <text x="918" y="225" text-anchor="end" font-family="${font}" font-size="22" font-weight="600" fill="#ffffff">*สำหรับรอบบิลแรก</text>
    ${centeredLines(sheet.detail, 270, 274, 27)}
    ${sheet.rows.map((r, i) => row(r, 352 + i * 116)).join("")}
    <rect x="605" y="845" width="412" height="72" rx="28" fill="#c7003d"/>
    <text x="811" y="892" text-anchor="middle" font-family="${font}" font-size="32" font-weight="700" fill="#fff">${esc(sheet.promo)}</text>
    <rect x="32" y="998" width="1016" height="72" rx="22" fill="#fffaf7" fill-opacity="0.94"/>
    <text x="64" y="1044" font-family="${font}" font-size="27" font-weight="700" fill="#3d302c">โปรโมชัน ${esc(sheet.date)} | ราคาและเงื่อนไขอาจเปลี่ยนแปลงได้</text>
  </svg>`);
}

for (const sheet of sheets) {
  const productPath = sheet.product === "washtower" ? path.join(out, "cutouts", "washtower-ai.png") : cutout(sheet.product);
  const product = await sharp(productPath).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(sheet.product === "washtower" ? 430 : 480, 660, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(path.join(out, "ai-podium-background.png")).resize(1080, 1080, { fit: "cover", position: "centre" })
    .composite([{ input: overlay(sheet), top: 0, left: 0 }, { input: product, top: 326, left: sheet.product === "washtower" ? 105 : 80 }])
    .png({ compressionLevel: 9 }).toFile(path.join(out, sheet.file));
}
