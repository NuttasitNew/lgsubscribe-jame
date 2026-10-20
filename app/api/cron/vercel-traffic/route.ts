import { cronAuthorized } from "@/lib/analytics/cron-auth";
import { missingVercelPullEnv, pullVercelTraffic, resolveVercelRange } from "@/lib/analytics/vercel-pull";

export const maxDuration = 300;

// Vercel Cron calls this daily after the UTC day closes. `?from=YYYY-MM-DD&to=YYYY-MM-DD` backfills (≤ 62 days).
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response(null, { status: 401 });
  const missing = missingVercelPullEnv();
  if (missing.length) return Response.json({ error: "Vercel API not configured", missing }, { status: 503 });
  const params = new URL(request.url).searchParams;
  let range;
  try {
    range = resolveVercelRange(params.get("from"), params.get("to"));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid range" },
      { status: 400 },
    );
  }
  try {
    const result = await pullVercelTraffic(range.start, range.end);
    return Response.json({ ...range, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ...range, error: error instanceof Error ? error.message : "unknown error" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
