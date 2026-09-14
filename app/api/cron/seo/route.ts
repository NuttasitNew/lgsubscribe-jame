import { timingSafeEqual } from "node:crypto";
import { syncSearchConsole } from "@/feature/backoffice/seo/sync";
import { defaultPeriod } from "@/feature/backoffice/seo/validation";
import { googleConfigured } from "@/feature/backoffice/seo/google";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    secret.length < 32 ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!googleConfigured()) return Response.json({ status: "not_configured" }, { status: 503, headers });
  const { start, end } = defaultPeriod();
  try {
    return Response.json(
      { status: "success", count: await syncSearchConsole(start, end), start, end },
      { headers },
    );
  } catch {
    return Response.json(
      { status: "failed", message: "Check SEO sync history in backoffice" },
      { status: 502, headers },
    );
  }
}
