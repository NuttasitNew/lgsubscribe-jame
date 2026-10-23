import { cronAuthorized } from "@/lib/analytics/cron-auth";
import { syncKeywordIdeas } from "@/lib/google-ads/sync-keyword-ideas";

export const maxDuration = 300;

// Monthly Google Ads Keyword Planner pull, seeded from catalog product categories.
// `?categories=water-purifier,air-purifier` limits the run to some categories.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new Response(null, { status: 401 });
  const categoriesParam = new URL(request.url).searchParams.get("categories");
  const categoryCodes = categoriesParam
    ? categoriesParam
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean)
    : undefined;

  try {
    const result = await syncKeywordIdeas({ categoryCodes });
    // FAILED usually means the developer token lacks Basic/Standard access (Explorer cannot use Keyword Planning).
    return Response.json(result, {
      status: result.status === "FAILED" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[SEO-KWI-01] seo-keyword-ideas failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
