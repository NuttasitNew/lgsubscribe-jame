/**
 * @description Stringify error ทุกแบบให้ได้ message ที่ debug จริง — ไม่ปล่อยเป็น string ว่าง
 * @logic
 * - String → return ตรงๆ
 * - Error ปกติ → รวม .message + .name + Prisma .code + .meta (ทุก field ที่เจอ)
 * - Prisma error บางตัว .message ว่าง แต่มี .code/.meta → return code + meta แทน
 * - ถ้าไม่เจออะไรเลย → fallback ใช้ .name + first stack line
 * - Object อื่น ๆ → JSON.stringify ครอบ own properties (จับ non-enumerable เช่น Error.name)
 * - null/undefined → "null/undefined" (ไม่ใช่ "")
 * @used-by
 * - feature/admin/pending-confirmation/server/action/expire-pending-orders.action.ts
 * - feature/admin/scheduler/call-detail-records/server/sync-call-detail-records.action.ts
 * - lib/google-ads/describe-google-ads-error.ts
 */

function safeJson(v: unknown): string {
  try {
    if (v && typeof v === "object") {
      return JSON.stringify(v, Object.getOwnPropertyNames(v as object));
    }
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Stringify error ให้ได้ message ที่ debug ได้เสมอ — รองรับ Prisma error ที่ .message ว่าง */
export function stringifyError(err: unknown): string {
  if (err === null || err === undefined) return "null/undefined";
  if (typeof err === "string") return err;
  if (typeof err === "number" || typeof err === "boolean") return String(err);

  if (err instanceof Error) {
    const parts: string[] = [];
    if (err.message) parts.push(err.message);

    const e = err as Error & { code?: string | number; meta?: unknown };
    if (e.code) parts.push(`[code:${e.code}]`);
    if (e.meta !== undefined) parts.push(`meta=${safeJson(e.meta)}`);

    if (parts.length > 0) return parts.join(" ");

    // .message + .code + .meta ว่างหมด → ใช้ name + first stack line (กัน "" ที่ debug ไม่ได้)
    const firstStack = err.stack?.split("\n")[0];
    return firstStack && firstStack !== `${err.name}: ` ? firstStack : err.name || "EmptyError";
  }

  return safeJson(err);
}
