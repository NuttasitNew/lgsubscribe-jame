import "server-only";
import prisma from "@/lib/seo/prisma";
import { SeoArticleJobStatus, SeoArticleJobType } from "@prisma/client";
import { runWriteCategoryJob } from "./run-write-category-job.helper";
import { runWriteNowJob } from "./run-write-now-job.helper";
import { runGenerateImagesJob } from "./run-generate-images-job.helper";
import { runTranslateEnJob } from "./run-translate-en-job.helper";
import { runSingleImageJob } from "./run-single-image-job.helper";
import { runWriteFaqJob } from "../../ask-answer-faq/server/run-write-faq-job.helper";
import { runTranslateFaqEnJob } from "../../ask-answer-faq/server/run-translate-faq-en-job.helper";
import type { SeoArticleJobRunner } from "./seo-article-job-runner.type";
import { runResearchKeywordsJob, runWriteFromKeywordJob } from "../../keyword-research/server/run-keyword-jobs.helper";

export interface RunSeoArticleJobResult {
  seoArticleJobId: number;
  status: SeoArticleJobStatus;
  jobType?: SeoArticleJobType;
  seoArticleId?: number;
  title?: string;
  errorMessage?: string;
}

/**
 * งานแต่ละชนิด → runner ของมัน — เพิ่มชนิดใหม่แล้ว TypeScript จะบังคับให้มาเติมที่นี่
 *
 * WRITE_FAQ / TRANSLATE_FAQ_EN เป็นงานของหน้า /ask-and-answer ไม่ใช่ของบทความ แต่ใช้คิวใบเดียวกัน
 * โดยตั้งใจ: worker เดียว แถบสถานะเดียว หน้าเดียว — แยกคิวที่สองมีแต่จะต้องทำ QStash route/UI ซ้ำทั้งชุด
 */
const RUNNERS: Record<SeoArticleJobType, SeoArticleJobRunner> = {
  [SeoArticleJobType.WRITE_CATEGORY]: runWriteCategoryJob,
  [SeoArticleJobType.WRITE_NOW]: runWriteNowJob,
  [SeoArticleJobType.GENERATE_IMAGES]: runGenerateImagesJob,
  [SeoArticleJobType.TRANSLATE_EN]: runTranslateEnJob,
  [SeoArticleJobType.SINGLE_IMAGE]: runSingleImageJob,
  [SeoArticleJobType.WRITE_FAQ]: runWriteFaqJob,
  [SeoArticleJobType.TRANSLATE_FAQ_EN]: runTranslateFaqEnJob,
  [SeoArticleJobType.RESEARCH_KEYWORDS]: runResearchKeywordsJob,
  [SeoArticleJobType.WRITE_FROM_KEYWORD]: runWriteFromKeywordJob,
};

/**
 * @description แกนของคิวงาน AI หน้า SEO Article — หยิบ job 1 ใบมาทำจริงแล้วปิดสถานะ (ทุกชนิดผ่านทางนี้ทางเดียว)
 * @logic
 * - **claim แบบ atomic**: updateMany เงื่อนไข status=QUEUED → RUNNING แล้วเช็ค count
 *   ถ้าได้ 0 แปลว่ามีคนหยิบไปแล้ว (QStash ส่งซ้ำได้เมื่อ retry) → จบเงียบ ไม่ทำซ้ำ
 *   ถ้าใช้ findUnique แล้วค่อย update จะมีช่องให้ 2 request ทำงานเดียวกันซ้ำ (= เสียเงิน AI 2 เท่า)
 * - แยกทางตาม jobType แล้วปล่อยให้ runner ทำงาน — **ตัวจัดคิวเป็นเจ้าของสถานะคนเดียว** runner แค่โยน Error เมื่อพัง
 *   ข้อความใน Error ไปโผล่บนหน้าจอตรง ๆ (errorMessage) จึงต้องอ่านรู้เรื่องและมี error code
 * - ไม่ retry เอง เพราะ AI call ที่พังกลางทางมักพังซ้ำ และ retry อัตโนมัติเสี่ยงได้ผลลัพธ์ซ้ำซ้อน (เช่นบทความ 2 เรื่อง)
 * - ทุกทางออกเซ็ต finishedAt เสมอ ไม่งั้นแถบ "กำลังทำงาน" บนหน้าจอจะค้างตลอดกาล
 * @param seoArticleJobId เลข job ที่ QStash ส่งมา
 * @returns ผลลัพธ์ของ job ใบนั้น
 * @used-by app/api/qstash/seo-article-generate/route.ts, {@link ./queue-seo-article-job.action.ts}
 * @related {@link ./seo-article-job-runner.type.ts}
 */
export const runSeoArticleJob = async (seoArticleJobId: number): Promise<RunSeoArticleJobResult> => {
  // claim: มีแค่ผู้ชนะรายเดียวที่ได้ count > 0 — กัน QStash retry ทำให้ทำงานซ้ำ
  const claimed = await prisma.seoArticleJob.updateMany({
    where: { seoArticleJobId, status: SeoArticleJobStatus.QUEUED },
    data: { status: SeoArticleJobStatus.RUNNING, startedAt: new Date() },
  });

  if (claimed.count === 0) {
    const existing = await prisma.seoArticleJob.findUnique({
      where: { seoArticleJobId },
      select: { status: true, jobType: true, seoArticleId: true, errorMessage: true },
    });
    if (!existing) throw new Error(`[SEO-JOB-01] ไม่พบงาน seoArticleJobId=${seoArticleJobId}`);
    return {
      seoArticleJobId,
      status: existing.status,
      jobType: existing.jobType,
      ...(existing.seoArticleId != null ? { seoArticleId: existing.seoArticleId } : {}),
      ...(existing.errorMessage ? { errorMessage: existing.errorMessage } : {}),
    };
  }

  const job = await prisma.seoArticleJob.findUniqueOrThrow({ where: { seoArticleJobId } });

  try {
    const output = await RUNNERS[job.jobType](job);

    await prisma.seoArticleJob.update({
      where: { seoArticleJobId },
      data: {
        status: SeoArticleJobStatus.DONE,
        ...(output.seoArticleId != null ? { seoArticleId: output.seoArticleId } : {}),
        ...(output.resultJson ? { resultJson: output.resultJson as object } : {}),
        finishedAt: new Date(),
      },
    });

    return {
      seoArticleJobId,
      status: SeoArticleJobStatus.DONE,
      jobType: job.jobType,
      ...(output.seoArticleId != null ? { seoArticleId: output.seoArticleId } : {}),
      ...(output.title ? { title: output.title } : {}),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown";
    await prisma.seoArticleJob.update({
      where: { seoArticleJobId },
      data: { status: SeoArticleJobStatus.FAILED, errorMessage, finishedAt: new Date() },
    });
    console.error(`[SEO-JOB-03] งาน ${job.jobType} ไม่สำเร็จ job=${seoArticleJobId}:`, errorMessage);
    return { seoArticleJobId, status: SeoArticleJobStatus.FAILED, jobType: job.jobType, errorMessage };
  }
};
