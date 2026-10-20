import { cronAuthorized } from "@/lib/analytics/cron-auth";
import { missingGooglePullEnv, pullGoogleReports, resolvePullRange } from "@/lib/analytics/google-pull";

export const maxDuration = 300;

// Vercel Cron calls this daily. `?from=YYYY-MM-DD&to=YYYY-MM-DD` backfills a range (same auth).
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response(null, { status: 401 });
  const missing = missingGooglePullEnv();
  if (missing.length) return Response.json({ error: "Google API not configured", missing }, { status: 503 });
  const params = new URL(request.url).searchParams;
  let range;
  try {
    range = resolvePullRange(params.get("from"), params.get("to"));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid range" },
      { status: 400 },
    );
  }
  const results = await pullGoogleReports(range.start, range.end);
  const failed = results.some((result) => "error" in result);
  return Response.json(
    { ...range, results },
    { status: failed ? 502 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
