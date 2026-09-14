import { normalizeKeyword, SeoInputError, validateMetrics } from "./validation";

// RFC 4180 quoted fields, BOM, CRLF and embedded newlines; no delimiter guessing.
export function parseCsv(text: string): string[][] {
  if (Buffer.byteLength(text, "utf8") > 500_000) throw new SeoInputError("CSV ต้องมีขนาดไม่เกิน 500 KB");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === '"') {
      if (field || closed) throw new SeoInputError("รูปแบบเครื่องหมายคำพูดใน CSV ไม่ถูกต้อง");
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed) throw new SeoInputError("มีข้อความหลังเครื่องหมายคำพูดปิดใน CSV");
      field += c;
    }
  }
  if (quoted) throw new SeoInputError("CSV มีเครื่องหมายคำพูดที่ยังไม่ปิด");
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length > 5001) throw new SeoInputError("นำเข้าได้ครั้งละไม่เกิน 5,000 แถว");
  return rows;
}
export function parseGscCsv(text: string) {
  const [header, ...rows] = parseCsv(text);
  if (!header || !rows.length) throw new SeoInputError("CSV ไม่มีข้อมูล");
  const normalized = header.map((x) => x.trim().toLowerCase());
  const index = (names: string[]) => normalized.findIndex((x) => names.includes(x));
  const query = index([
    "top queries",
    "query",
    "keyword",
    "ข้อความค้นหายอดนิยม",
    "ข้อความค้นหา",
    "คำค้นหายอดนิยม",
  ]);
  const clicks = index(["clicks", "การคลิก"]),
    impressions = index(["impressions", "การแสดงผล", "จำนวนการแสดงผล"]),
    position = index(["position", "average position", "อันดับ", "อันดับเฉลี่ย", "ตำแหน่ง"]);
  if ([query, clicks, impressions, position].includes(-1))
    throw new SeoInputError(
      "ใช้ CSV แท็บ Queries จาก Search Console ที่มี Query, Clicks, Impressions, Position และเป็นช่วงเวลาเดียว",
    );
  const seen = new Set<string>();
  const number = (value: string) => (value.trim() === "" ? NaN : Number(value.replace(/,/g, "")));
  return rows.map((row, i) => {
    if (row.length !== header.length) throw new SeoInputError(`จำนวนคอลัมน์แถว ${i + 2} ไม่ตรงกับหัวตาราง`);
    const keyword = normalizeKeyword(row[query]);
    if (!keyword || keyword.length > 160 || seen.has(keyword))
      throw new SeoInputError(`คำค้นหาว่างหรือซ้ำในแถว ${i + 2}`);
    seen.add(keyword);
    return {
      normalized: keyword,
      ...validateMetrics(number(row[clicks]), number(row[impressions]), number(row[position])),
    };
  });
}
export function csvCell(value: string | number | null) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
