import { GoogleAdsApi, Customer } from "google-ads-api";

let cachedCustomer: Customer | null = null;

/**
 * @description สร้าง/คืน Google Ads customer client (singleton) ผูกบัญชีจริงผ่าน MCC
 * @logic
 * - ใช้ env 6 ตัว: CLIENT_ID, CLIENT_SECRET, DEVELOPER_TOKEN (auth ระดับ app)
 *   + CUSTOMER_ID (บัญชีจริงที่ query/mutate), LOGIN_CUSTOMER_ID (MCC ที่เข้าผ่าน), REFRESH_TOKEN
 * - cache ไว้ระดับ module — สร้างครั้งเดียวต่อ instance (refresh token จัดการ access token เอง)
 * - ใช้ร่วมทั้ง read (sync-campaigns) และ write (mutate)
 * @used-by {@link sync-campaigns.ts}
 * @throws [GADS-CLIENT-01] เมื่อ env ไม่ครบ
 */
export function getGoogleAdsCustomer(): Customer {
  if (cachedCustomer) return cachedCustomer;

  // lg-jame ใช้ OAuth client/refresh token ชุดเดียวกับรายงาน Google (GOOGLE_OAUTH_*) — GOOGLE_ADS_* ตั้งแยกได้ถ้าต้องการ
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "");
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, "") || undefined;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN || process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !developerToken || !customerId || !refreshToken) {
    throw new Error(
      "[GADS-CLIENT-01] Google Ads env ไม่ครบ (ต้องมี GOOGLE_OAUTH_CLIENT_ID/SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID)"
    );
  }

  const api = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken,
  });

  cachedCustomer = api.Customer({
    customer_id: customerId, // บัญชีจริงที่ยิงโฆษณา
    ...(loginCustomerId ? { login_customer_id: loginCustomerId } : {}), // MCC ที่เข้าผ่าน (ถ้ามี)
    refresh_token: refreshToken,
  });

  return cachedCustomer;
}

/**
 * @description customerId (string ไม่มีขีด) ของบัญชีจริงที่ sync/แสดงผล
 * @used-by {@link sync-campaigns.ts}
 */
export function getGoogleAdsCustomerId(): string {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, "");
  if (!customerId) throw new Error("[GADS-CLIENT-01] GOOGLE_ADS_CUSTOMER_ID ไม่ถูกตั้งค่า");
  return customerId;
}
