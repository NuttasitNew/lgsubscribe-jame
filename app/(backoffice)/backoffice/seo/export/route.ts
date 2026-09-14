import { hasBackofficeAccess } from "@/feature/backoffice/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { csvCell } from "@/feature/backoffice/seo/csv";
export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!(await hasBackofficeAccess())) return new Response("Unauthorized", { status: 401, headers });
  const keywords = await getPrisma().seoKeyword.findMany({
    orderBy: { keyword: "asc" },
    include: { measurements: { orderBy: { periodEnd: "desc" } } },
  });
  const rows: (string | number | null)[][] = [
    [
      "keyword",
      "target_path",
      "country",
      "device",
      "target_rank",
      "active",
      "period_start",
      "period_end",
      "source",
      "status",
      "clicks",
      "impressions",
      "ctr_percent",
      "average_position",
      "observed_page",
      "measured_at",
    ],
  ];
  for (const k of keywords)
    for (const m of k.measurements.length ? k.measurements : [null])
      rows.push([
        k.keyword,
        k.targetPath,
        k.country,
        k.device,
        k.targetRank,
        String(k.active),
        m?.periodStart.toISOString().slice(0, 10) ?? null,
        m?.periodEnd.toISOString().slice(0, 10) ?? null,
        m?.source ?? null,
        m?.status ?? "NOT_MEASURED",
        m?.clicks ?? null,
        m?.impressions ?? null,
        m?.impressions ? (m.clicks! / m.impressions) * 100 : null,
        m?.position ?? null,
        m?.observedPage ?? null,
        m?.measuredAt.toISOString() ?? null,
      ]);
  return new Response("\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="seo-history.csv"',
    },
  });
}
