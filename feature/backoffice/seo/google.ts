import { createSign } from "node:crypto";
import { normalizeKeyword, SeoInputError, validateMetrics } from "./validation";

const tokenUrl = "https://oauth2.googleapis.com/token";
const scope = "https://www.googleapis.com/auth/webmasters.readonly";
export function googleConfigured() {
  return !!process.env.GSC_SERVICE_ACCOUNT_JSON && !!process.env.GSC_SITE_URL;
}
export async function getGoogleAccessToken() {
  if (!googleConfigured())
    throw new SeoInputError(
      "ยังไม่ได้เชื่อม Search Console: ตั้งค่า GSC_SITE_URL และ service account ที่มีสิทธิ์อ่าน property นี้",
    );
  let account: { client_email: string; private_key: string };
  try {
    account = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON!);
    if (
      typeof account.client_email !== "string" ||
      !account.client_email.endsWith(".iam.gserviceaccount.com") ||
      typeof account.private_key !== "string"
    )
      throw new Error();
  } catch {
    throw new SeoInputError("รูปแบบ service account ไม่ถูกต้อง กรุณาตรวจค่าบนเซิร์ฟเวอร์");
  }
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: account.client_email, scope, aud: tokenUrl, iat: now, exp: now + 3600 })}`;
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(body).sign(account.private_key, "base64url");
  } catch {
    throw new SeoInputError("ไม่สามารถใช้กุญแจ service account ได้");
  }
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${body}.${signature}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new SeoInputError("Google ไม่อนุญาตให้เชื่อมต่อ กรุณาตรวจ service account");
  const token = await response.json();
  if (typeof token.access_token !== "string") throw new SeoInputError("Google ไม่ส่ง access token กลับมา");
  return token.access_token as string;
}

type Row = { keys?: string[]; clicks: number; impressions: number; position: number };
export type GoogleMeasurement = {
  status: "MEASURED" | "NO_DATA";
  clicks: number | null;
  impressions: number | null;
  position: number | null;
  observedPage: string | null;
};
export async function fetchKeywordMetrics(
  token: string,
  keyword: { keyword: string; country: string; device: string },
  start: string,
  end: string,
): Promise<GoogleMeasurement> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(process.env.GSC_SITE_URL!)}/searchAnalytics/query`;
  const base = {
    startDate: start,
    endDate: end,
    type: "web",
    dataState: "final",
    dimensionFilterGroups: [
      {
        groupType: "and",
        filters: [
          {
            dimension: "query",
            operator: "includingRegex",
            expression: `(?i)^${normalizeKeyword(keyword.keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          },
          { dimension: "country", operator: "equals", expression: keyword.country },
          { dimension: "device", operator: "equals", expression: keyword.device.toLowerCase() },
        ],
      },
    ],
  };
  const query = async (dimensions: string[], rowLimit: number, aggregationType: string) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...base, dimensions, rowLimit, aggregationType }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new SeoInputError(
        response.status === 403
          ? "ไม่มีสิทธิ์อ่าน property นี้ หรือยังไม่ได้เปิด Search Console API"
          : `Search Console ตอบกลับไม่สำเร็จ (${response.status}) ลองใหม่ภายหลัง`,
      );
    const result = await response.json();
    if (result.rows !== undefined && !Array.isArray(result.rows))
      throw new SeoInputError("รูปแบบผลจาก Google ไม่ถูกต้อง");
    return (result.rows ?? []) as Row[];
  };
  // Query-level totals come directly from Google, never summed from page rows.
  const totals = await query([], 1, "byProperty");
  if (!totals.length)
    return { status: "NO_DATA", clicks: null, impressions: null, position: null, observedPage: null };
  const metrics = validateMetrics(totals[0].clicks, totals[0].impressions, totals[0].position);
  const pages = await query(["page"], 1, "auto");
  const page = pages[0]?.keys?.[0];
  let observedPage: string | null = null;
  if (page) {
    try {
      const parsed = new URL(page);
      if (parsed.protocol === "https:") observedPage = parsed.href;
    } catch {
      /* Ignore malformed display URL. */
    }
  }
  return { ...metrics, status: "MEASURED", observedPage };
}
