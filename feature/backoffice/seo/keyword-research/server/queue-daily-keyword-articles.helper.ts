import "server-only";

import { SeoArticleJobStatus, SeoArticleJobType, SeoKeywordStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";
import { r2Configured } from "@/lib/r2/media-upload";
import { enqueueSeoArticleJob } from "../../seo-article/server/enqueue-seo-article-job.helper";
import type { SeoWriteFromKeywordPayload } from "../../seo-article/type/seo-article-job-payload.type";

export const DAILY_ARTICLE_COUNT = 2;
/** รอบแรกสุด (ยังไม่เคยเขียนบทความจากคำค้นเลย) เขียนชุดตั้งต้นให้มากกว่ารายวัน */
export const STARTER_ARTICLE_COUNT = 3;
/** คำค้นที่เขียนพังภายในช่วงนี้ไม่หยิบซ้ำทุกวัน (กันเสียเงินซ้ำกับคำที่ AI หาข้อมูลไม่ได้) */
const FAILED_COOLDOWN_DAYS = 3;
/** คำที่ยังไม่ได้เขียนเหลือน้อยกว่านี้ → สั่ง research คำใหม่เติมคลัง */
const MIN_KEYWORD_BACKLOG = 4;
const REQUESTED_BY = "ระบบ (รายวัน)";

export interface QueueDailyKeywordArticlesResult {
  queued: { seoKeywordId: number; keyword: string; seoArticleJobId: number }[];
  researchQueued: boolean;
  backlog: number;
  generateImages: boolean;
}

/**
 * @description งานประจำวัน — หยิบคำค้นที่ยังไม่มีบทความ (ความสำคัญสูงสุดก่อน) มาเขียนร่างวันละ {@link DAILY_ARTICLE_COUNT} เรื่อง
 * @logic
 * - รอบแรกที่มีคำให้เขียน (ยังไม่เคยมีงานเขียนจากคำค้นเลย) เขียน {@link STARTER_ARTICLE_COUNT} เรื่องเป็นชุดตั้งต้น
 * - ยังไม่มีคำในระบบเลย → วันนั้นสั่ง research อย่างเดียว เรียก cron อีกรอบหลัง research เสร็จจึงได้ชุดตั้งต้น
 * - ผู้สมัคร: ไม่ถูกปัดตก (DISMISSED), ยังไม่ผูกบทความ, ไม่มีงานเขียนของคำนั้นค้างอยู่ในคิว,
 *   และไม่ได้เขียนพังภายใน {@link FAILED_COOLDOWN_DAYS} วัน
 * - เรียง priority มาก → น้อย แล้วคำที่เข้าระบบก่อน
 * - คำเหลือน้อยกว่า {@link MIN_KEYWORD_BACKLOG} → สั่ง RESEARCH_KEYWORDS เติมคลังให้วันถัดไป (ถ้ายังไม่มีงาน research ค้าง)
 * - วาดรูปเฉพาะเมื่อตั้ง R2 แล้ว — ไม่มีที่เก็บรูป สั่งวาดไปก็เสียเงินฟรีแล้วงานพัง
 * - บทความออกมาเป็นร่างเสมอ คนต้องตรวจแล้วกดเผยแพร่เอง (ตัวเลขในตารางเทียบควรมีคนดูก่อนขึ้นเว็บ)
 * @used-by app/api/cron/seo-daily-articles/route.ts
 */
export const queueDailyKeywordArticles = async (params?: { count?: number }): Promise<QueueDailyKeywordArticlesResult> => {
  const everWritten = await prisma.seoArticleJob.count({ where: { jobType: SeoArticleJobType.WRITE_FROM_KEYWORD } });
  const defaultCount = everWritten === 0 ? STARTER_ARTICLE_COUNT : DAILY_ARTICLE_COUNT;
  const count = Math.min(Math.max(params?.count ?? defaultCount, 1), 5);
  const since = new Date(Date.now() - FAILED_COOLDOWN_DAYS * 86400000);

  const [keywords, writeJobs, activeResearch] = await Promise.all([
    prisma.seoKeyword.findMany({
      where: { status: { not: SeoKeywordStatus.DISMISSED }, seoArticleId: null },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: { seoKeywordId: true, keyword: true },
    }),
    prisma.seoArticleJob.findMany({
      where: {
        jobType: SeoArticleJobType.WRITE_FROM_KEYWORD,
        OR: [
          { status: { in: [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING] } },
          { status: SeoArticleJobStatus.FAILED, createdAt: { gte: since } },
        ],
      },
      select: { payload: true },
    }),
    prisma.seoArticleJob.count({
      where: {
        jobType: SeoArticleJobType.RESEARCH_KEYWORDS,
        status: { in: [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING] },
      },
    }),
  ]);

  const blocked = new Set(
    writeJobs.map((job) => (job.payload as unknown as SeoWriteFromKeywordPayload | null)?.seoKeywordId).filter(Boolean)
  );
  const candidates = keywords.filter((keyword) => !blocked.has(keyword.seoKeywordId));
  const generateImages = r2Configured();

  const queued: QueueDailyKeywordArticlesResult["queued"] = [];
  for (const keyword of candidates.slice(0, count)) {
    const result = await enqueueSeoArticleJob({
      jobType: SeoArticleJobType.WRITE_FROM_KEYWORD,
      label: keyword.keyword,
      requestedBy: REQUESTED_BY,
      generateImages,
      payload: { seoKeywordId: keyword.seoKeywordId } satisfies SeoWriteFromKeywordPayload,
    });
    queued.push({ seoKeywordId: keyword.seoKeywordId, keyword: keyword.keyword, seoArticleJobId: result.seoArticleJobId });
  }

  const backlog = candidates.length - queued.length;
  let researchQueued = false;
  if (backlog < MIN_KEYWORD_BACKLOG && activeResearch === 0) {
    await enqueueSeoArticleJob({ jobType: SeoArticleJobType.RESEARCH_KEYWORDS, label: "หาคำค้นใหม่ (รายวัน)", requestedBy: REQUESTED_BY });
    researchQueued = true;
  }

  return { queued, researchQueued, backlog, generateImages };
};
