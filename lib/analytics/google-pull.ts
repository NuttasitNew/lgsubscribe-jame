import {
  parseGoogleSnapshot,
  saveGoogleSnapshot,
  type GoogleMetric,
  type GoogleSnapshot,
} from "@/lib/analytics/google-sync";
import { bangkokToday, dateRange } from "@/lib/analytics/date-range";

export const GOOGLE_PULL_LOOKBACK_DAYS = 7;

type Provider = GoogleSnapshot["provider"];
type ProviderResult =
  { provider: Provider; days: number; saved: number } | { provider: Provider; error: string };

export function shiftDay(day: string, offset: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
}

function eachDay(start: string, end: string) {
  const days: string[] = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) days.push(day);
  return days;
}

/** Default window = last 7 completed Bangkok days (refreshes late conversions); overrides are for backfill. */
export function resolvePullRange(from?: string | null, to?: string | null, now = new Date()) {
  const yesterday = shiftDay(bangkokToday(now), -1);
  const end = to || yesterday;
  const start = from || shiftDay(end, -(GOOGLE_PULL_LOOKBACK_DAYS - 1));
  dateRange(start, end);
  if (end > yesterday) throw new Error("ดึงได้เฉพาะวันที่จบแล้ว (ถึงเมื่อวานเวลาไทย)");
  return { start, end };
}

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function missingGooglePullEnv() {
  return [
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REFRESH_TOKEN",
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
    "GA4_PROPERTY_ID",
  ].filter((name) => !env(name));
}

async function accessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      refresh_token: env("GOOGLE_OAUTH_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token)
    throw new Error(`Google OAuth failed: ${data.error ?? response.status}`);
  return data.access_token;
}

async function postJson<T>(url: string, token: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} HTTP ${response.status}`);
  return (await response.json()) as T;
}

type AdsRow = {
  customer?: { timeZone?: string; currencyCode?: string };
  segments?: { date: string };
  campaign?: { id: string; name: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
    allConversions?: number;
  };
};

async function adsSearch(token: string, query: string) {
  const customerId = env("GOOGLE_ADS_CUSTOMER_ID");
  const version = env("GOOGLE_ADS_API_VERSION") || "v23";
  const login = env("GOOGLE_ADS_LOGIN_CUSTOMER_ID");
  const headers: Record<string, string> = { "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN") };
  if (login) headers["login-customer-id"] = login;
  const rows: AdsRow[] = [];
  let pageToken: string | undefined;
  do {
    const page = await postJson<{ results?: AdsRow[]; nextPageToken?: string }>(
      `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:search`,
      token,
      { query, pageToken, pageSize: 10000 },
      headers,
    );
    rows.push(...(page.results ?? []));
    pageToken = page.nextPageToken || undefined;
  } while (pageToken);
  return rows;
}

async function pullGoogleAds(token: string, start: string, end: string, asOf: string) {
  const [account] = await adsSearch(
    token,
    "SELECT customer.time_zone, customer.currency_code FROM customer LIMIT 1",
  );
  if (account?.customer?.timeZone !== "Asia/Bangkok" || account.customer.currencyCode !== "THB")
    throw new Error("Unexpected Google Ads timezone/currency");
  const rows = await adsSearch(
    token,
    `SELECT segments.date, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions FROM campaign WHERE segments.date BETWEEN '${start}' AND '${end}'`,
  );
  const byDay = new Map<string, GoogleMetric[]>(eachDay(start, end).map((day) => [day, []]));
  for (const row of rows) {
    const day = row.segments?.date;
    if (!day || !row.campaign || !row.metrics || !byDay.has(day)) continue;
    byDay.get(day)!.push({
      segment: String(row.campaign.id),
      label: row.campaign.name,
      impressions: Number(row.metrics.impressions ?? 0),
      clicks: Number(row.metrics.clicks ?? 0),
      costMicros: Number(row.metrics.costMicros ?? 0),
      conversions: Number(row.metrics.conversions ?? 0),
      allConversions: Number(row.metrics.allConversions ?? 0),
    });
  }
  return [...byDay].map(([day, metrics]) => ({
    provider: "google_ads" as const,
    externalId: env("GOOGLE_ADS_CUSTOMER_ID"),
    day,
    timeZone: "Asia/Bangkok",
    currency: "THB",
    quality: "reported" as const,
    asOf,
    rows: metrics,
  }));
}

type GaReport = {
  rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
  rowCount?: number;
  metadata?: {
    timeZone?: string;
    currencyCode?: string;
    dataLossFromOtherRow?: boolean;
    samplingMetadatas?: unknown[];
    subjectToThresholding?: boolean;
  };
};
type GaQuality = GoogleSnapshot["quality"];

async function gaReport(
  token: string,
  start: string,
  end: string,
  dimensions: string[],
  metrics: string[],
  dimensionFilter?: unknown,
) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${env("GA4_PROPERTY_ID")}:runReport`;
  const rows: NonNullable<GaReport["rows"]> = [];
  let quality: GaQuality = "reported";
  let rowCount = 0;
  do {
    const report = await postJson<GaReport>(url, token, {
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      limit: 10000,
      offset: rows.length,
      ...(dimensionFilter ? { dimensionFilter } : {}),
    });
    const metadata = report.metadata ?? {};
    if (metadata.timeZone !== "Asia/Bangkok" || (metadata.currencyCode && metadata.currencyCode !== "THB"))
      throw new Error("GA4 timezone/currency mismatch");
    if (metadata.dataLossFromOtherRow) quality = "partial";
    else if (metadata.samplingMetadatas?.length && quality !== "partial") quality = "sampled";
    else if (metadata.subjectToThresholding && quality === "reported") quality = "thresholded";
    const page = report.rows ?? [];
    rowCount = Number(report.rowCount ?? 0);
    if (rowCount > 50000) throw new Error("GA4 report too large; pull a shorter period");
    if (!page.length && rows.length < rowCount) throw new Error("Incomplete GA4 page");
    rows.push(...page);
  } while (rows.length < rowCount);
  return { rows, quality };
}

const gaDay = (value: string) => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

async function pullGa4(token: string, start: string, end: string, asOf: string) {
  // Fetch every report before saving so an API error can never become a zero snapshot.
  const metrics = ["activeUsers", "sessions", "screenPageViews"];
  const daily = await gaReport(token, start, end, ["date"], metrics);
  const channels = await gaReport(token, start, end, ["date", "sessionSourceMedium"], metrics);
  const contacts = await gaReport(token, start, end, ["date", "sessionSourceMedium"], ["eventCount"], {
    filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "contact_click" } },
  });
  const quality = [daily, channels, contacts].map((report) => report.quality);
  const gaQuality: GaQuality = quality.includes("partial")
    ? "partial"
    : quality.includes("sampled")
      ? "sampled"
      : quality.includes("thresholded")
        ? "thresholded"
        : "reported";
  const total = (): GoogleMetric => ({
    segment: "__total__",
    label: "Daily total",
    visitors: 0,
    sessions: 0,
    views: 0,
    contactClicks: 0,
  });
  const byDay = new Map<string, Map<string, GoogleMetric>>(
    eachDay(start, end).map((day) => [day, new Map([["__total__", total()]])]),
  );
  const num = (row: { metricValues: Array<{ value: string }> }, index: number) =>
    Number(row.metricValues[index].value);
  for (const row of daily.rows) {
    const segments = byDay.get(gaDay(row.dimensionValues[0].value));
    if (segments)
      segments.set("__total__", {
        ...total(),
        visitors: num(row, 0),
        sessions: num(row, 1),
        views: num(row, 2),
      });
  }
  for (const row of channels.rows) {
    const segments = byDay.get(gaDay(row.dimensionValues[0].value));
    const label = row.dimensionValues[1].value;
    if (segments)
      segments.set(`channel:${label}`, {
        segment: `channel:${label}`,
        label,
        visitors: num(row, 0),
        sessions: num(row, 1),
        views: num(row, 2),
        contactClicks: 0,
      });
  }
  for (const row of contacts.rows) {
    const segments = byDay.get(gaDay(row.dimensionValues[0].value));
    const label = row.dimensionValues[1].value;
    if (!segments) continue;
    const key = `channel:${label}`;
    const channel = segments.get(key) ?? {
      segment: key,
      label,
      visitors: 0,
      sessions: 0,
      views: 0,
      contactClicks: 0,
    };
    channel.contactClicks = num(row, 0);
    segments.set(key, channel);
    segments.get("__total__")!.contactClicks = (segments.get("__total__")!.contactClicks ?? 0) + num(row, 0);
  }
  return [...byDay].map(([day, segments]) => ({
    provider: "ga4" as const,
    externalId: env("GA4_PROPERTY_ID"),
    day,
    timeZone: "Asia/Bangkok",
    currency: "THB",
    quality: gaQuality,
    asOf,
    rows: [...segments.values()],
  }));
}

async function persist(
  provider: Provider,
  snapshots: Array<Record<string, unknown>>,
): Promise<ProviderResult> {
  let saved = 0;
  for (const snapshot of snapshots) if (await saveGoogleSnapshot(parseGoogleSnapshot(snapshot))) saved++;
  return { provider, days: snapshots.length, saved };
}

export async function pullGoogleReports(start: string, end: string) {
  const token = await accessToken();
  const asOf = new Date().toISOString();
  const jobs: Array<[Provider, () => Promise<Array<Record<string, unknown>>>]> = [
    ["google_ads", () => pullGoogleAds(token, start, end, asOf)],
    ["ga4", () => pullGa4(token, start, end, asOf)],
  ];
  // Providers are independent: one failing must not block the other from saving.
  return Promise.all(
    jobs.map(async ([provider, pull]): Promise<ProviderResult> => {
      try {
        return await persist(provider, await pull());
      } catch (error) {
        return { provider, error: error instanceof Error ? error.message : "unknown error" };
      }
    }),
  );
}
