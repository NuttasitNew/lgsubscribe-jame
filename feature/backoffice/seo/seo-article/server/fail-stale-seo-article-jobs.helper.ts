import "server-only";

import { SeoArticleJobStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";

/** เกินเพดาน 800 วินาทีของ Vercel ไปพอสมควรแล้ว = function ถูกตัดทิ้ง งานไม่มีวันจบเอง */
const RUNNING_TIMEOUT_MS = 16 * 60 * 1000;
/** ส่งต่อไม่ถึง route รันงาน (ไม่มีใครหยิบ) */
const QUEUED_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * @description ปิดงานที่ค้างเพราะ function ถูกตัด (หมดเวลา/deploy ใหม่กลางงาน) ให้เป็น FAILED
 * @logic
 * - runner ปิดสถานะเองทุกทางออก ยกเว้นตอน process ตาย — งานค้าง RUNNING ตลอดกาล แถบสถานะหมุนไม่หยุด
 *   และ cron รายวันจะไม่หยิบคำนั้นซ้ำ (ถือว่ายังมีงานค้าง)
 * - ไม่สั่งงานใหม่ให้อัตโนมัติ: ผลที่บันทึกไว้ (เช่นผลอ่านคู่แข่ง) ใช้ซ้ำได้เมื่อสั่งใหม่ ไม่ต้องจ่ายซ้ำ
 * @used-by find-seo-article-jobs.action.ts (ตอนแถบสถานะ poll), queue-daily-keyword-articles.helper.ts
 */
export const failStaleSeoArticleJobs = async (): Promise<number> => {
  const now = Date.now();
  const [running, queued] = await Promise.all([
    prisma.seoArticleJob.updateMany({
      where: { status: SeoArticleJobStatus.RUNNING, startedAt: { lt: new Date(now - RUNNING_TIMEOUT_MS) } },
      data: {
        status: SeoArticleJobStatus.FAILED,
        errorMessage: "[SEO-JOB-05] งานหมดเวลา (ระบบตัดเมื่อเกิน 800 วินาที) — สั่งใหม่ได้ ผลค้นคว้าที่บันทึกแล้วจะถูกใช้ต่อ",
        finishedAt: new Date(now),
      },
    }),
    prisma.seoArticleJob.updateMany({
      where: { status: SeoArticleJobStatus.QUEUED, createdAt: { lt: new Date(now - QUEUED_TIMEOUT_MS) } },
      data: {
        status: SeoArticleJobStatus.FAILED,
        errorMessage: "[SEO-JOB-06] งานไม่ถูกหยิบไปทำ — สั่งใหม่อีกครั้ง",
        finishedAt: new Date(now),
      },
    }),
  ]);
  return running.count + queued.count;
};
