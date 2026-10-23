import "server-only";
import { importPKCS8, SignJWT } from "jose";

/**
 * @description Google Search Console client — auth ด้วย service account (JWT → access token)
 *              ใช้ดึง Search Analytics (query/page/position/clicks/impressions) ของเว็บ lg-jame (LG Subscribe)
 *
 * @config env variables:
 * - GSC_CLIENT_EMAIL: client_email ของ service account (ต้องถูกเพิ่มเป็น user ใน GSC property)
 * - GSC_PRIVATE_KEY: private_key ของ service account (PKCS8, \n escape ได้)
 * - GSC_SITE_URL: property บน GSC เช่น "sc-domain:lgthailand-subscribe.com" หรือ "https://www.lgthailand-subscribe.com/"
 *
 * @used-by app/api/cron/seo-gsc-sync/route.ts
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

/** access token cache ระดับ module — Google ให้ token อายุ 1 ชม. */
let cachedToken: { token: string; expiresAt: number } | null = null;

/** ตรวจว่า env GSC ครบไหม — cron ใช้ skip แบบไม่ error ตอนยังไม่ได้ตั้งค่า */
export const isGscConfigured = (): boolean => {
  return Boolean(process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY && process.env.GSC_SITE_URL);
};

/**
 * @description แลก service account JWT เป็น access token (cache 55 นาที)
 * @logic sign RS256 JWT (iss=client_email, scope=webmasters.readonly) → POST token endpoint
 */
const getAccessToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const clientEmail = (process.env.GSC_CLIENT_EMAIL || "").trim();
  const privateKeyPem = (process.env.GSC_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!clientEmail || !privateKeyPem) throw new Error("[GSC-CLIENT-01] GSC_CLIENT_EMAIL/GSC_PRIVATE_KEY ไม่ถูกตั้งค่า");

  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`[GSC-CLIENT-02] แลก access token ไม่สำเร็จ: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
  return data.access_token;
};

export interface GscQueryRow {
  keys: string[]; // ค่าตาม dimensions ที่ขอ เช่น [page, query]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscSearchAnalyticsParams {
  startDate: string; // "yyyy-MM-dd"
  endDate: string; // "yyyy-MM-dd"
  dimensions: ("page" | "query" | "date" | "country" | "device")[];
  /** filter เช่น page contains "/blog/" */
  dimensionFilterGroups?: {
    filters: { dimension: string; operator: "contains" | "equals" | "includingRegex"; expression: string }[];
  }[];
  rowLimit?: number; // 1-25000 (default 25000)
  startRow?: number;
}

/**
 * @description เรียก GSC Search Analytics API — คืน rows (clicks/impressions/ctr/position ต่อ dimension keys)
 * @logic POST searchanalytics/query ของ GSC_SITE_URL, dataState=final (ข้อมูลนิ่งแล้ว ~2-3 วันย้อนหลัง)
 */
export const gscSearchAnalytics = async (params: GscSearchAnalyticsParams): Promise<GscQueryRow[]> => {
  const siteUrl = (process.env.GSC_SITE_URL || "").trim();
  if (!siteUrl) throw new Error("[GSC-CLIENT-03] GSC_SITE_URL ไม่ถูกตั้งค่า");

  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions,
        dimensionFilterGroups: params.dimensionFilterGroups,
        rowLimit: params.rowLimit ?? 25000,
        startRow: params.startRow ?? 0,
        dataState: "final",
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`[GSC-CLIENT-04] Search Analytics query ไม่สำเร็จ: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { rows?: GscQueryRow[] };
  return data.rows ?? [];
};
