import "server-only";

import { after } from "next/server";

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
 * Runs a queued SeoArticleJob after the current response is sent.
 * hmp-frontend used QStash for this; lg-jame has no queue, so the job runs in the same
 * function invocation via `after()` (kept alive up to the route's maxDuration on Vercel).
 * runSeoArticleJob records its own failures on the job row.
 */
export async function scheduleSeoArticleJob(
  params: ScheduleSeoArticleJobParams,
): Promise<ScheduleSeoArticleJobResult> {
  try {
    after(async () => {
      await runSeoArticleJob(params.seoArticleJobId).catch((error) => {
        console.error(`[SEO-JOBQ-13] job=${params.seoArticleJobId} failed:`, error);
      });
    });
    return { queued: true };
  } catch (error) {
    return { queued: false, reason: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
