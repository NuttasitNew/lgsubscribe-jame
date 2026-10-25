import { cronAuthorized } from "@/lib/analytics/cron-auth";
import { queueDailyKeywordArticles } from "@/feature/backoffice/seo/keyword-research/server/queue-daily-keyword-articles.helper";

export const maxDuration = 60;

// Daily: queue draft articles for the top keywords that have none yet (each job runs in its own invocation).
// `?count=3` overrides the daily count for a manual kick-off (max 5).
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response(null, { status: 401 });
  const countParam = Number(new URL(request.url).searchParams.get("count"));
  try {
    const result = await queueDailyKeywordArticles(Number.isFinite(countParam) && countParam > 0 ? { count: countParam } : undefined);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[SEO-DAILY-01] seo-daily-articles failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
