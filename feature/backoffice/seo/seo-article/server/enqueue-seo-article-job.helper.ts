import "server-only";
import prisma from "@/lib/seo/prisma";
import { SeoArticleJobStatus, SeoArticleJobType } from "@prisma/client";
import { scheduleSeoArticleJob } from "./schedule-seo-article-job.helper";
import { runSeoArticleJob } from "./run-seo-article-job.helper";
import type { SeoArticleJobPayload } from "../type/seo-article-job-payload.type";

export interface EnqueueSeoArticleJobParams {
  jobType: SeoArticleJobType;
  /** ป้ายชื่องานบนแถบสถานะ (ไม่ใช่หัวข้อบทความเสมอไป) */
  label: string;
  /** ใครสั่ง — cron ใช้ "ระบบ (cron)" */
  requestedBy: string;
  /** บทความต้นทาง — งานที่ทำกับบทความที่มีอยู่แล้วต้องมีเสมอ */
  seoArticleId?: number;
  /** โทนการเขียน (เฉพาะงานที่เขียนบทความ) */
  tone?: string | null;
  /** วาดรูปประกอบด้วยไหม (เฉพาะงานที่เขียนบทความ) */
  generateImages?: boolean;
  payload?: SeoArticleJobPayload;
}

export interface EnqueueSeoArticleJobResult {
  seoArticleJobId: number;
  /** true = ไม่มี QStash (dev) จึงรัน worker ในเครื่องแบบไม่รอผลแทน */
  ranInline: boolean;
  /** true = publish ล้มทั้งที่มีคิว → job ถูกปิดเป็น FAILED แล้ว ผู้เรียกควรบอกให้คนกดสั่งใหม่ */
  failed: boolean;
  error?: string;
}

/**
 * @description สร้างแถวงานในคิว SeoArticleJob + ส่งเข้า QStash — แกนร่วมของทั้งปุ่มบนหน้าจอและงานเบื้องหลัง (cron/runner)
 * @access server-only
 * @logic
 * - แยกออกมาจาก `queue-seo-article-job.action.ts` เพราะเดิมตรรกะนี้ผูกกับ cookie ของ super-admin
 *   ทำให้ cron/worker ที่ไม่มีผู้ใช้เรียกใช้ไม่ได้ ต้อง copy โค้ดหรือทำงานหนักเองใน request เดียว
 * - `reason === "error"` (มีคิวแต่ publish ล้ม) → ปิด job เป็น FAILED ทันที **ห้ามรัน inline ต่อ**
 *   เพราะ serverless function อาจถูกฆ่ากลางทางจนงานค้าง RUNNING ตลอดกาล
 * - `reason === "unavailable"` (dev ไม่มี QSTASH_TOKEN) → รัน worker แบบ fire-and-forget
 *   ความพังระหว่างทำถูก runSeoArticleJob บันทึกลง job เองอยู่แล้ว
 * - ตัวเรียกเป็นคนตรวจสิทธิ์/กันกดรัวเอง — helper นี้ไม่มี auth เพราะ cron ไม่มีผู้ใช้
 * @param params ชนิดงาน + ป้ายชื่อ + บทความต้นทาง
 * @returns เลข job + ผลการส่งเข้าคิว
 * @used-by {@link ./generate-seo-article-drafts.helper.ts}, {@link ./run-generate-images-job.helper.ts}
 * @related {@link ./queue-seo-article-job.action.ts}, {@link ../../../../../lib/qstash/schedule-seo-article-job.ts}
 */
export const enqueueSeoArticleJob = async (params: EnqueueSeoArticleJobParams): Promise<EnqueueSeoArticleJobResult> => {
  const job = await prisma.seoArticleJob.create({
    data: {
      jobType: params.jobType,
      topic: params.label,
      requestedBy: params.requestedBy,
      ...(params.tone !== undefined ? { tone: params.tone } : {}),
      ...(params.generateImages !== undefined ? { generateImages: params.generateImages } : {}),
      ...(params.seoArticleId != null ? { seoArticleId: params.seoArticleId } : {}),
      ...(params.payload ? { payload: params.payload as object } : {}),
    },
    select: { seoArticleJobId: true },
  });

  const scheduled = await scheduleSeoArticleJob({ seoArticleJobId: job.seoArticleJobId });

  if (scheduled.reason === "error") {
    await prisma.seoArticleJob.update({
      where: { seoArticleJobId: job.seoArticleJobId },
      data: {
        status: SeoArticleJobStatus.FAILED,
        errorMessage: "[SEO-JOBQ-12] ส่งงานเข้าคิวไม่สำเร็จ — กดสั่งใหม่อีกครั้ง",
        finishedAt: new Date(),
      },
    });
    console.error(`[SEO-JOBQ-12] publish ล้ม job=${job.seoArticleJobId} (${params.jobType}):`, scheduled.error);
    return {
      seoArticleJobId: job.seoArticleJobId,
      ranInline: false,
      failed: true,
      ...(scheduled.error ? { error: scheduled.error } : {}),
    };
  }

  const ranInline = scheduled.reason === "unavailable";
  if (ranInline) {
    void runSeoArticleJob(job.seoArticleJobId).catch((error) => {
      console.error(`[SEO-JOBQ-13] รัน inline ไม่สำเร็จ job=${job.seoArticleJobId}:`, error);
    });
  }

  return { seoArticleJobId: job.seoArticleJobId, ranInline, failed: false };
};
