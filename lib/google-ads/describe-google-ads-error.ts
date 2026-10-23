import { stringifyError } from "@/lib/seo/helper/stringify-error";

const MAX_CHARS = 8000;
const UNSAFE_KEYS = new Set(["config", "request", "headers", "socket", "_session"]);

interface AdsErrorItem {
  message?: string;
  error_code?: Record<string, unknown>;
  errorCode?: Record<string, unknown>;
  location?: unknown;
  trigger?: unknown;
}

/**
 * @description แปลง error จาก google-ads-api ให้เป็นข้อความที่ debug ได้จริง — ไม่ปล่อยเป็น "unknown"
 * @logic
 * - library โยน `GoogleAdsFailure` ซึ่ง **ไม่ใช่** `Error` (ไม่มี `.message`) — `instanceof Error` จึงได้ "unknown"
 * - รายละเอียดจริงอยู่ใน `errors[]`: error_code (เช่น query_error=UNRECOGNIZED_FIELD vs authorization_error),
 *   message, location.field_path_elements (field ที่พัง), request_id
 * - แนบ `toJSON()` ของ failure ทั้งก้อนไว้ท้ายข้อความ เพื่อให้ cron/Axiom เก็บ object ครบ
 * - ไม่ dump axios `config`/`headers` (กัน access token หลุดลง log)
 * @param error ค่าที่จับได้จาก try/catch ของ google-ads-api
 * @returns ข้อความที่เอาไปขึ้น log / errorMessage ได้ — ตัดที่ 8000 ตัวอักษร
 * @used-by {@link syncGoogleAdsRecommendations}, {@link syncKeywordIdeas}
 * @related {@link helper/stringify-error.ts}
 */
export function describeGoogleAdsError(error: unknown): string {
  if (error === null || error === undefined) return "null/undefined";
  if (typeof error === "string") return error;

  const parts: string[] = [];
  const detail = error as {
    errors?: AdsErrorItem[];
    message?: string;
    request_id?: string;
    requestId?: string;
    response?: { status?: number; data?: { error?: RestErrorBody } };
  };

  const adsItems = Array.isArray(detail.errors) ? detail.errors : [];
  const adsParts = adsItems.map(describeAdsItem).filter(Boolean);
  if (adsParts.length > 0) parts.push(adsParts.join(" | "));

  const requestId = detail.request_id || detail.requestId;
  if (typeof requestId === "string" && requestId !== "") parts.push(`request_id=${requestId}`);

  const rest = detail.response?.data?.error;
  if (rest) {
    const statusBits = [detail.response?.status, rest.status, rest.code].filter((v) => v != null).join(" ");
    if (statusBits) parts.push(`http=${statusBits}`);
    if (rest.message) parts.push(rest.message);
    const restDetails = Array.isArray(rest.details) ? rest.details : [];
    for (const item of restDetails) {
      const fromDetail = describeRestDetail(item);
      if (fromDetail) parts.push(fromDetail);
    }
  }

  if (parts.length === 0 && typeof detail.message === "string" && detail.message !== "") {
    parts.push(detail.message);
  }
  if (parts.length === 0 && error instanceof Error && error.message) {
    parts.push(error.message);
  }

  const raw = snapshotAdsObject(error);
  if (raw) parts.push(`raw=${raw}`);

  if (parts.length === 0) return stringifyError(error);

  const out = parts.join(" ; ");
  return out.length > MAX_CHARS ? `${out.slice(0, MAX_CHARS)}…(truncated)` : out;
}

interface RestErrorBody {
  message?: string;
  status?: string;
  code?: number | string;
  details?: unknown[];
}

function describeAdsItem(item: AdsErrorItem): string {
  const codeObj = item.error_code ?? item.errorCode;
  const code = codeObj && typeof codeObj === "object" ? Object.entries(codeObj)[0] : undefined;
  const path = fieldPath(item.location);
  const trigger = item.trigger != null ? safeJson(item.trigger) : "";
  return [
    code ? `${code[0]}=${String(code[1])}` : "",
    path ? `field=${path}` : "",
    item.message ?? "",
    trigger ? `trigger=${trigger}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function fieldPath(location: unknown): string {
  if (!location || typeof location !== "object") return "";
  const rec = location as { field_path_elements?: unknown; fieldPathElements?: unknown };
  const elements = rec.field_path_elements ?? rec.fieldPathElements;
  if (!Array.isArray(elements)) return "";
  return elements
    .map((el) => {
      if (!el || typeof el !== "object") return "";
      const node = el as { field_name?: string; fieldName?: string; index?: number };
      const name = node.field_name ?? node.fieldName ?? "";
      if (!name) return "";
      return node.index != null ? `${name}[${node.index}]` : name;
    })
    .filter(Boolean)
    .join(".");
}

function describeRestDetail(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const rec = item as {
    errors?: AdsErrorItem[];
    request_id?: string;
    requestId?: string;
    message?: string;
  };
  const bits: string[] = [];
  if (Array.isArray(rec.errors)) {
    const inner = rec.errors.map(describeAdsItem).filter(Boolean);
    if (inner.length > 0) bits.push(inner.join(" | "));
  }
  const requestId = rec.request_id || rec.requestId;
  if (typeof requestId === "string" && requestId !== "") bits.push(`request_id=${requestId}`);
  if (bits.length === 0 && rec.message) bits.push(rec.message);
  return bits.join(" ; ");
}

function snapshotAdsObject(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  try {
    const rec = error as { toJSON?: () => unknown };
    if (typeof rec.toJSON === "function") {
      return safeJson(rec.toJSON());
    }
  } catch {
    // ใช้ safe snapshot ด้านล่าง
  }
  const snap = stripUnsafe(error, 0);
  if (snap && typeof snap === "object" && !Array.isArray(snap) && Object.keys(snap).length === 0) {
    return null;
  }
  const json = safeJson(snap);
  return json === "{}" || json === "[]" ? null : json;
}

function stripUnsafe(value: unknown, depth: number): unknown {
  if (depth > 6) return "[max-depth]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => stripUnsafe(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (UNSAFE_KEYS.has(key)) continue;
    if (/authorization|access.?token|refresh.?token|secret|password/i.test(key)) continue;
    out[key] = stripUnsafe(nested, depth + 1);
  }
  return out;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "null";
  } catch {
    return String(value);
  }
}
