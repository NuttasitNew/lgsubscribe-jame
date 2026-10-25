import { after } from "next/server";
import { cronAuthorized } from "@/lib/analytics/cron-auth";
import { runSeoArticleJob } from "@/feature/backoffice/seo/seo-article/server/run-seo-article-job.helper";

// งาน AI ยาวสุดราว 9 นาที (เก็บข้อมูลตารางเทียบ) — Pro + Fluid Compute ให้ได้ถึง 800 วินาทีต่อการเรียก
export const maxDuration = 800;

/**
 * รับงานจาก scheduleSeoArticleJob แล้วรันใน function invocation ของตัวเอง
 * — ตอบ 202 ทันที ตัวงานวิ่งต่อใน after() จนถึง maxDuration ของ route นี้ (ไม่ผูกกับเวลาของหน้าที่กดสั่ง)
 */
export async function POST(request: Request) {
  if (!cronAuthorized(request)) return new Response(null, { status: 401 });
  const body = (await request.json().catch(() => null)) as { seoArticleJobId?: unknown } | null;
  const seoArticleJobId = Number(body?.seoArticleJobId);
  if (!Number.isInteger(seoArticleJobId) || seoArticleJobId <= 0) {
    return Response.json({ error: "seoArticleJobId required" }, { status: 400 });
  }

  after(async () => {
    await runSeoArticleJob(seoArticleJobId).catch((error) => {
      console.error(`[SEO-JOBQ-14] job=${seoArticleJobId} failed:`, error);
    });
  });
  return Response.json({ accepted: true, seoArticleJobId }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
