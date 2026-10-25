import "server-only";

import { after } from "next/server";

import { siteConfig } from "@/lib/site";
import { runSeoArticleJob } from "./run-seo-article-job.helper";

export interface ScheduleSeoArticleJobParams {
  seoArticleJobId: number;
}

export interface ScheduleSeoArticleJobResult {
  queued: boolean;
  reason?: "unavailable" | "error";
  error?: string;
}

/**
 * Runs a queued SeoArticleJob in the background.
 * @logic
 * - **Production**: POST to `/api/seo/jobs/run/` so every job gets its own function invocation
 *   (maxDuration 800s). Running inside the caller's `after()` would cap the job at the caller's
 *   maxDuration (the SEO page is 300s) while a compare-table research step alone takes ~9 minutes.
 *   The route answers 202 immediately, so the caller only waits for the hand-off.
 * - Anywhere else (local dev / preview) or if the hand-off fails: `after()` in the same invocation.
 * - Outside a request (local scripts): `after()` throws → reason "unavailable" → caller runs it inline.
 * runSeoArticleJob records its own failures on the job row.
 */
export async function scheduleSeoArticleJob(
  params: ScheduleSeoArticleJobParams,
): Promise<ScheduleSeoArticleJobResult> {
  if (process.env.VERCEL_ENV === "production" && process.env.CRON_SECRET) {
    try {
      const response = await fetch(`${siteConfig.url}/api/seo/jobs/run/`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, "content-type": "application/json" },
        body: JSON.stringify({ seoArticleJobId: params.seoArticleJobId }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 202) return { queued: true };
      console.error(`[SEO-JOBQ-15] hand-off job=${params.seoArticleJobId} got HTTP ${response.status} — running in place`);
    } catch (error) {
      console.error(`[SEO-JOBQ-15] hand-off job=${params.seoArticleJobId} failed — running in place:`, error);
    }
  }

  try {
    after(async () => {
      await runSeoArticleJob(params.seoArticleJobId).catch((error) => {
        console.error(`[SEO-JOBQ-13] job=${params.seoArticleJobId} failed:`, error);
      });
    });
    return { queued: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // นอก request (สคริปต์) — ให้ผู้เรียกรันแบบ inline แทน
    if (/outside a request scope/i.test(message)) return { queued: false, reason: "unavailable" };
    return { queued: false, reason: "error", error: message };
  }
}
