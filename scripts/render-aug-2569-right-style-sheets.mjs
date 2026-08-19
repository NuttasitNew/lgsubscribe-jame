import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "output/promotions/aug-2569");
const font = "Sukhumvit Set, Tahoma, sans-serif";
const cutout = (name) => path.join(out, "cutouts", `${name}.png`);

const sheets = [
  { file: "07-water-purifier-right-style.png", product: "water", title: "เครื่องกรองน้ำ LG PuriCare", model: "WD516 / WD518", detail: "สัญญาสูงสุด 7 ปี | เริ่มเพียง 149.-*", rows: [["5 ปี", "799.-", "Visit Service"], ["5 ปี", "699.-", "Self Service"], ["7 ปี", "599.-", "Visit Service"], ["7 ปี", "499.-", "Self Service"]], promo: "ลด 50% รอบบิลที่ 2-12", date: "12-31 ส.ค. 2569" },
  { file: "08-washtower-right-style.png", product: "washtower-ai", title: "LG WashTower ซัก 14 กก. / อบ 10 กก.", model: "WT1410NHEG", detail: "รับประกันมอเตอร์และคอมเพรสเซอร์ 10 ปี | เริ่มเพียง 149.-*", rows: [["5 ปี", "1,599.-", "Visit Service"], ["5 ปี", "1,499.-", "Self Service"], ["6 ปี", "1,399.-", "Visit Service"], ["6 ปี", "1,299.-", "Self Service"]], promo: "ลด 50% รอบบิลที่ 2-12", date: "11-31 ส.ค. 2569" },
];

const esc = (v) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

function priceCard([years, price, service], y) {
  return `<rect x="574" y="${y}" width="442" height="119" rx="27" fill="#ed3b3d"/>
    <rect x="574" y="${y}" width="162" height="119" rx="27" fill="#fffaf7"/>
    <text x="655" y="${y + 43}" text-anchor="middle" font-family="${font}" font-size="25" font-weight="600" fill="#c7003d">สัญญา</text>
    <text x="655" y="${y + 84}" text-anchor="middle" font-family="${font}" font-size="40" font-weight="700" fill="#c7003d">${esc(years)}</text>
    <text x="766" y="${y + 54}" font-family="${font}" font-size="54" font-weight="700" fill="#fff">${esc(price)}</text>
    <text x="973" y="${y + 51}" font-family="${font}" font-size="21" font-weight="600" fill="#fff">/เดือน</text>
    <text x="766" y="${y + 91}" font-family="${font}" font-size="25" font-weight="600" fill="#fff">${esc(service)}</text>`;
}

function overlay(sheet) {
  return Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1080" fill="#f4e6db" fill-opacity="0.15"/>
    <text x="52" y="72" font-family="${font}" font-size="35" font-weight="700" fill="#392d2a">${esc(sheet.title)}</text>
    <text x="52" y="117" font-family="${font}" font-size="26" font-weight="500" fill="#5d4b44">รุ่น ${esc(sheet.model)}</text>
    <rect x="52" y="145" width="460" height="105" rx="27" fill="#c7003d"/>
    <text x="282" y="208" text-anchor="middle" font-family="${font}" font-size="61" font-weight="700" fill="#fff">เริ่มเพียง 149.-</text>
    <text x="282" y="237" text-anchor="middle" font-family="${font}" font-size="20" font-weight="600" fill="#fff">*สำหรับรอบบิลแรก</text>
    <text x="52" y="294" font-family="${font}" font-size="24" font-weight="600" fill="#392d2a">${esc(sheet.detail)}</text>
    ${sheet.rows.map((r, i) => priceCard(r, 330 + i * 132)).join("")}
    <rect x="574" y="874" width="442" height="70" rx="24" fill="#c7003d"/>
    <text x="795" y="920" text-anchor="middle" font-family="${font}" font-size="29" font-weight="700" fill="#fff">${esc(sheet.promo)}</text>
    <rect x="30" y="984" width="1020" height="66" rx="20" fill="#fffaf7" fill-opacity="0.95"/>
    <text x="52" y="1026" font-family="${font}" font-size="23" font-weight="700" fill="#3d302c">โปรโมชัน ${esc(sheet.date)} | ราคาและเงื่อนไขอาจเปลี่ยนแปลงได้</text>
  </svg>`);
}

for (const sheet of sheets) {
  const source = sheet.product === "washtower-ai" ? path.join(out, "cutouts", "washtower-ai.png") : cutout(sheet.product);
  const product = await sharp(source).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(450, 660, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(path.join(out, "ai-podium-background.png")).resize(1080, 1080, { fit: "cover", position: "centre" })
    .composite([{ input: overlay(sheet), top: 0, left: 0 }, { input: product, top: 320, left: 45 }])
    .png({ compressionLevel: 9 }).toFile(path.join(out, sheet.file));
}
