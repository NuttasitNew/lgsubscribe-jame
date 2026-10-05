import { createHmac, timingSafeEqual } from "node:crypto";
import { dateRange } from "@/lib/analytics/date-range";
import { getPrisma } from "@/lib/db/prisma";

export type GoogleMetric = {
  segment: string;
  label: string;
  visitors?: number;
  sessions?: number;
  views?: number;
  contactClicks?: number;
  impressions?: number;
  clicks?: number;
  costMicros?: number;
  conversions?: number;
  allConversions?: number;
};
export type GoogleSnapshot = {
  provider: "google_ads" | "ga4";
  externalId: string;
  day: string;
  timeZone: string;
  currency: string;
  quality: "reported" | "thresholded" | "sampled" | "partial";
  asOf: string;
  rows: GoogleMetric[];
};

export function validSyncSignature(
  body: string,
  timestamp: string | null,
  signature: string | null,
  now = Date.now(),
) {
  const secret = process.env.GOOGLE_REPORT_SYNC_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    !timestamp ||
    !/^\d{13}$/.test(timestamp) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  if (Math.abs(now - Number(timestamp)) > 300000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function parseGoogleSnapshot(input: unknown): GoogleSnapshot {
  if (!input || typeof input !== "object") throw new Error("Invalid snapshot");
  const data = input as Record<string, unknown>;
  const expected =
    data.provider === "google_ads"
      ? process.env.GOOGLE_ADS_CUSTOMER_ID
      : data.provider === "ga4"
        ? process.env.GA4_PROPERTY_ID
        : null;
  if (!expected || data.externalId !== expected || !/^\d{6,15}$/.test(expected))
    throw new Error("Unexpected Google account");
  if (typeof data.day !== "string") throw new Error("Invalid day");
  dateRange(data.day, data.day);
  if (data.timeZone !== "Asia/Bangkok" || data.currency !== "THB")
    throw new Error("Report timezone/currency mismatch");
  const quality = data.quality ?? "reported";
  if (!["reported", "thresholded", "sampled", "partial"].includes(quality as string))
    throw new Error("Invalid data quality");
  if (
    typeof data.asOf !== "string" ||
    !Number.isFinite(Date.parse(data.asOf)) ||
    Date.parse(data.asOf) > Date.now() + 60000
  )
    throw new Error("Invalid snapshot timestamp");
  if (!Array.isArray(data.rows) || data.rows.length > 1000) throw new Error("Too many report rows");
  const fields =
    data.provider === "google_ads"
      ? ["impressions", "clicks", "costMicros", "conversions", "allConversions"]
      : ["visitors", "sessions", "views", "contactClicks"];
  const segments = new Set<string>();
  const rows = data.rows.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Invalid metric row");
    const item = value as Record<string, unknown>;
    if (
      typeof item.segment !== "string" ||
      item.segment.length < 1 ||
      item.segment.length > 300 ||
      typeof item.label !== "string" ||
      item.label.length > 300 ||
      /[\x00-\x1f]/.test(item.segment + item.label) ||
      segments.has(item.segment)
    )
      throw new Error("Invalid segment");
    segments.add(item.segment);
    const row: Record<string, string | number> = { segment: item.segment, label: item.label };
    for (const field of fields) {
      const value = item[field];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > Number.MAX_SAFE_INTEGER ||
        (!field.includes("onversions") && !Number.isSafeInteger(value))
      )
        throw new Error(`Invalid ${field}`);
      row[field] = value;
    }
    return row as GoogleMetric;
  });
  if (data.provider === "ga4" && !segments.has("__total__")) throw new Error("Missing daily total");
  return {
    provider: data.provider as GoogleSnapshot["provider"],
    externalId: expected,
    day: data.day,
    timeZone: "Asia/Bangkok",
    currency: "THB",
    quality: quality as GoogleSnapshot["quality"],
    asOf: data.asOf,
    rows,
  };
}

export async function saveGoogleSnapshot(snapshot: GoogleSnapshot) {
  const day = new Date(`${snapshot.day}T00:00:00Z`);
  const asOf = new Date(snapshot.asOf);
  // One atomic upsert per complete day; retries replace rather than add metrics.
  const result = await getPrisma().$executeRaw`
    INSERT INTO "GoogleDailySnapshot" (id, provider, "externalId", day, currency, "timeZone", quality, "asOf", "syncedAt", rows)
    VALUES (gen_random_uuid()::text, ${snapshot.provider}, ${snapshot.externalId}, ${day}, ${snapshot.currency}, ${snapshot.timeZone}, ${snapshot.quality}, ${asOf}, NOW(), ${JSON.stringify(snapshot.rows)}::jsonb)
    ON CONFLICT (provider, "externalId", day) DO UPDATE SET rows=EXCLUDED.rows, "asOf"=EXCLUDED."asOf", "syncedAt"=NOW(), currency=EXCLUDED.currency, "timeZone"=EXCLUDED."timeZone", quality=EXCLUDED.quality
    WHERE "GoogleDailySnapshot"."asOf" <= EXCLUDED."asOf"`;
  return result > 0;
}
