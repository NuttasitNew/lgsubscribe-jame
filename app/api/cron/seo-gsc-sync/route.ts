import { cronAuthorized } from "@/lib/analytics/cron-auth";
import { isGscConfigured } from "@/lib/gsc/client";
import { syncGscSearchQueries } from "@/lib/gsc/sync-search-queries.helper";
import { syncKeywordRanks } from "@/lib/gsc/sync-keyword-ranks.helper";

export const maxDuration = 120;

// Daily Google Search Console pull for /blog/ pages (feeds the SEO article metrics),
// then site-wide positions of the keywords we chose to play (SeoKeyword TRACKING).
// `?start=YYYY-MM-DD&end=YYYY-MM-DD` backfills a range.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response(null, { status: 401 });
  if (!isGscConfigured())
    return Response.json({ skipped: "GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY / GSC_SITE_URL not configured" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const start = params.get("start");
  const end = params.get("end");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if ((start && !datePattern.test(start)) || (end && !datePattern.test(end)))
    return Response.json({ error: "start/end must be YYYY-MM-DD" }, { status: 400 });

  try {
    const result = await syncGscSearchQueries({ startDate: start || undefined, endDate: end || undefined });
    const ranks = await syncKeywordRanks();
    if (ranks.errors.length) console.error("[GSC-SYNC-02] keyword rank errors:", ranks.errors);
    return Response.json({ ...result, ranks }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GSC-SYNC-01] seo-gsc-sync failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
