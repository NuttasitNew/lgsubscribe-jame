import { cookies } from "next/headers";
import { validSession, sessionCookie } from "@/lib/backoffice/auth";
import { bangkokToday, dateRange } from "@/lib/analytics/date-range";
import {
  buildGoogleReportScript,
  buildGa4ReportScript,
  ga4Manifest,
} from "@/lib/analytics/google-ads-script";

export async function GET(request: Request) {
  if (!validSession((await cookies()).get(sessionCookie)?.value)) return new Response(null, { status: 401 });
  const secret = process.env.GOOGLE_REPORT_SYNC_SECRET;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const propertyId = process.env.GA4_PROPERTY_ID;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || secret.length < 32 || !customerId || !propertyId || !site)
    return new Response("Google sync is not configured", { status: 503 });
  const source = new URL(request.url).searchParams.get("source") ?? "google_ads";
  if (!["google_ads", "ga4", "ga4_manifest"].includes(source)) return new Response(null, { status: 400 });
  const build = source === "ga4" ? buildGa4ReportScript : buildGoogleReportScript;
  const params = new URL(request.url).searchParams;
  let historyRange: { start: string; end: string } | undefined;
  if (params.has("start") || params.has("end")) {
    try {
      const range = dateRange(params.get("start") ?? "", params.get("end") ?? "");
      if (range.end >= bangkokToday()) throw new Error("Use completed reporting days");
      historyRange = { start: range.start, end: range.end };
    } catch {
      return new Response("Invalid historical date range", { status: 400 });
    }
  }
  const code =
    source === "ga4_manifest"
      ? JSON.stringify(ga4Manifest, null, 2)
      : build({
          secret,
          customerId,
          propertyId,
          endpoint: new URL("/api/analytics/google-sync/", site).href,
          historyRange,
        });
  return new Response(code, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition":
        source === "ga4_manifest"
          ? 'attachment; filename="appsscript.json"'
          : `attachment; filename="lg-subscribe-${source}-report-sync.js"`,
      "Cache-Control": "private, no-store",
    },
  });
}
