import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "output/promotions/aug-2569");
const font = "Sukhumvit Set, Tahoma, sans-serif";
const variants = [
  { file: "09-water-start149-ref-variant.png", product: "water.png", title: "เครื่องกรองน้ำ LG PuriCare", model: "WD516 / WD518", detail: "สัญญาสูงสุด 7 ปี | Visit และ Self" },
  { file: "10-washtower-start149-ref-variant.png", product: "washtower-ai.png", title: "LG WashTower ซัก 14 กก. / อบ 10 กก.", model: "WT1410NHEG", detail: "รับประกันมอเตอร์และคอมเพรสเซอร์ 10 ปี" },
];
const esc = (v) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
function priceRow(years, price, service, y) {
  return `<circle cx="570" cy="${y + 36}" r="36" fill="#c7003d"/>
  <text x="570" y="${y + 29}" text-anchor="middle" font-family="${font}" font-size="16" font-weight="700" fill="#fff">สัญญา</text>
  <text x="570" y="${y + 53}" text-anchor="middle" font-family="${font}" font-size="27" font-weight="700" fill="#fff">${years}</text>
  <rect x="620" y="${y}" width="397" height="72" rx="27" fill="#fff"/>
  <text x="647" y="${y + 29}" font-family="${font}" font-size="23" font-weight="700" fill="#332927">${service}</text>
  <text x="647" y="${y + 62}" font-family="${font}" font-size="38" font-weight="700" fill="#c7003d">${price}</text>
  <text x="943" y="${y + 60}" font-family="${font}" font-size="18" font-weight="600" fill="#c7003d">/เดือน</text>`;
}
function overlay(v) { return Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1080" fill="#f4e6db" fill-opacity="0.12"/>
  <text x="540" y="75" text-anchor="middle" font-family="${font}" font-size="44" font-weight="700" fill="#ffffff" stroke="#8f817b" stroke-opacity="0.33" stroke-width="2">${esc(v.title)}</text>
  <rect x="136" y="107" width="808" height="190" rx="64" fill="#ef3438"/>
  <text x="540" y="160" text-anchor="middle" font-family="${font}" font-size="35" font-weight="700" fill="#fff">เริ่มเพียง</text>
  <rect x="290" y="173" width="500" height="91" rx="46" fill="#fff"/>
  <text x="540" y="238" text-anchor="middle" font-family="${font}" font-size="67" font-weight="700" fill="#101010">149.-</text>
  <text x="540" y="286" text-anchor="middle" font-family="${font}" font-size="24" font-weight="600" fill="#fff">*สำหรับรอบบิลแรก</text>
  <text x="270" y="336" text-anchor="middle" font-family="${font}" font-size="25" font-weight="600" fill="#392d2a">${esc(v.detail)}</text>
  ${v.model === "WT1410NHEG" ? priceRow("5 ปี", "1,599.-", "Visit Service", 369) : priceRow("5 ปี", "799.-", "Visit Service", 369)}
  ${v.model === "WT1410NHEG" ? priceRow("5 ปี", "1,499.-", "Self Service", 455) : priceRow("5 ปี", "699.-", "Self Service", 455)}
  ${v.model === "WT1410NHEG" ? priceRow("6 ปี", "1,399.-", "Visit Service", 541) : priceRow("7 ปี", "599.-", "Visit Service", 541)}
  ${v.model === "WT1410NHEG" ? priceRow("6 ปี", "1,299.-", "Self Service", 627) : priceRow("7 ปี", "499.-", "Self Service", 627)}
  <rect x="605" y="748" width="412" height="72" rx="28" fill="#c7003d"/>
  <text x="811" y="795" text-anchor="middle" font-family="${font}" font-size="29" font-weight="700" fill="#fff">ลด 50% รอบบิลที่ 2-12</text>
  <rect x="32" y="982" width="1016" height="72" rx="22" fill="#fffaf7" fill-opacity="0.94"/>
  <text x="64" y="1028" font-family="${font}" font-size="25" font-weight="700" fill="#3d302c">โปรโมชันสิงหาคม 2569 | ราคาและเงื่อนไขอาจเปลี่ยนแปลงได้</text>
</svg>`); }
for (const v of variants) {
  const product = await sharp(path.join(out, "cutouts", v.product)).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(450, 680, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(path.join(out, "ai-podium-background.png")).resize(1080, 1080, { fit: "cover" }).composite([{ input: overlay(v), top: 0, left: 0 }, { input: product, top: 350, left: 35 }]).png({ compressionLevel: 9 }).toFile(path.join(out, v.file));
}
