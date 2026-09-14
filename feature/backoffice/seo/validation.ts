export class SeoInputError extends Error {}
export const devices = ["MOBILE", "DESKTOP", "TABLET"] as const;
export const sources = ["GSC_API", "GSC_CSV"] as const;
export const normalizeKeyword = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH");

export function parseKeyword(input: Record<string, unknown>) {
  const keyword = String(input.keyword ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const targetPath = String(input.targetPath ?? "").trim();
  const cluster = String(input.cluster ?? "ทั่วไป").trim();
  const priority = String(input.priority ?? "P1");
  const country = String(input.country ?? "tha").toLowerCase();
  const device = String(input.device ?? "MOBILE");
  const targetRank = Number(input.targetRank ?? 10);
  if (!keyword || keyword.length > 160) throw new SeoInputError("คำค้นหาต้องมีความยาว 1–160 ตัวอักษร");
  if (
    !/^\/(?!\/)[a-zA-Z0-9\-/_]*$/.test(targetPath) ||
    targetPath.startsWith("/backoffice") ||
    targetPath.startsWith("/api") ||
    targetPath.length > 300
  )
    throw new SeoInputError("หน้าปลายทางต้องเป็นเส้นทางหน้าสาธารณะ เช่น /products/");
  if (!cluster || cluster.length > 60 || !["P1", "P2", "monitor"].includes(priority))
    throw new SeoInputError("กรุณาตรวจสอบกลุ่มและความสำคัญ");
  if (!/^[a-z]{3}$/.test(country) || !devices.includes(device as (typeof devices)[number]))
    throw new SeoInputError("ประเทศใช้รหัส ISO 3 ตัว เช่น tha และต้องเลือกอุปกรณ์");
  if (!Number.isInteger(targetRank) || targetRank < 1 || targetRank > 100)
    throw new SeoInputError("อันดับเป้าหมายต้องอยู่ระหว่าง 1–100");
  return {
    keyword,
    normalized: normalizeKeyword(keyword),
    targetPath: targetPath === "/" ? "/" : `${targetPath.replace(/\/$/, "")}/`,
    cluster,
    priority,
    country,
    device,
    targetRank,
  };
}
export function dateOnly(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new SeoInputError("วันที่ไม่ถูกต้อง");
  return date;
}
export function parsePeriod(start: string, end: string, now = new Date()) {
  const periodStart = dateOnly(start),
    periodEnd = dateOnly(end);
  const days = (periodEnd.getTime() - periodStart.getTime()) / 86400000 + 1;
  if (days < 1 || days > 90 || periodEnd > now)
    throw new SeoInputError("เลือกช่วงเวลา 1–90 วัน และไม่เกินวันปัจจุบัน");
  return { periodStart, periodEnd };
}
export function defaultPeriod(now = new Date()) {
  const pt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const end = new Date(dateOnly(pt).getTime() - 3 * 86400000);
  return {
    start: new Date(end.getTime() - 27 * 86400000).toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
export function validateMetrics(clicks: number, impressions: number, position: number) {
  if (
    ![clicks, impressions, position].every(Number.isFinite) ||
    !Number.isSafeInteger(clicks) ||
    !Number.isSafeInteger(impressions) ||
    clicks < 0 ||
    impressions < 1 ||
    clicks > impressions ||
    position < 1 ||
    position > 10000
  )
    throw new SeoInputError("ตัวเลขคลิก การแสดงผล หรืออันดับไม่ถูกต้อง (แถวที่ไม่มีการแสดงผลไม่ต้องนำเข้า)");
  return { clicks, impressions, position };
}
export function previousPeriod(start: Date, end: Date) {
  const length = end.getTime() - start.getTime() + 86400000;
  return { start: new Date(start.getTime() - length), end: new Date(start.getTime() - 86400000) };
}
