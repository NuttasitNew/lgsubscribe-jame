import { SeoArticleJobStatus, SeoArticleJobType } from "@prisma/client";
import type { SeoArticleJobItem } from "../server/find-seo-article-jobs.action";

/** งานที่ยังไม่จบ — ปุ่มที่สั่งงานเหล่านี้ต้องหมุนค้างไว้ */
const ACTIVE_STATUSES: SeoArticleJobStatus[] = [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING];

export interface SeoArticleJobFilter {
  jobType: SeoArticleJobType;
  /** บทความต้นทาง — ไม่ระบุ = งานที่ไม่ผูกบทความ (เช่น WRITE_NOW) */
  seoArticleId?: number;
}

/**
 * @description หา "งานที่ยังทำอยู่" ตรงเงื่อนไขจากรายการคิวที่ query ดึงมาก้อนเดียว
 * @logic
 * - คิวถูกดึงมาทั้งหน้าในครั้งเดียว (query เดียว poll เดียว) แต่ละปุ่มจึงต้องกรองเอาเฉพาะงานของตัวเอง
 *   เพื่อรู้ว่าจะหมุนต่อไหม — นี่คือสิ่งที่มาแทน `isPending` ของ mutation เดิม
 * - ระบุ seoArticleId = ต้องตรงเป๊ะ ไม่ระบุ = เอาเฉพาะงานที่ไม่ผูกบทความ (กันปุ่ม "เขียนทันที" บนหน้า hub
 *   ไปหมุนตามงาน gen รูปของบทความอื่นที่บังเอิญเป็นชนิดเดียวกัน)
 * @param jobs รายการคิวจาก findSeoArticleJobs
 * @param filter ชนิดงาน + บทความ
 * @returns งานที่ยังไม่จบใบล่าสุด หรือ undefined ถ้าไม่มี
 * @used-by seo-article-hub-main.tsx, seo-article-editor-page.tsx, seo-article-en-meta-form.tsx, seo-article-review-dialog.tsx
 */
export const findActiveSeoArticleJob = (
  jobs: SeoArticleJobItem[],
  filter: SeoArticleJobFilter
): SeoArticleJobItem | undefined =>
  jobs.find(
    (job) =>
      job.jobType === filter.jobType &&
      ACTIVE_STATUSES.includes(job.status) &&
      (filter.seoArticleId != null ? job.seoArticleId === filter.seoArticleId : job.seoArticleId == null)
  );

/**
 * @description หางานที่ "เพิ่งจบ" ตรงเงื่อนไข — ใช้ดึงผลลัพธ์ที่เดินทางกลับมาทาง resultJson
 * @logic
 * - เรียงใหม่→เก่ามาจาก action อยู่แล้ว จึงหยิบใบแรกที่เจอได้เลย = ใบล่าสุด
 * - นับเฉพาะ DONE เพราะงานที่พัง (FAILED) ไม่มีผลลัพธ์ให้เอาไปใช้ ผู้ใช้ต้องเห็นข้อความพังแทน
 * @param jobs รายการคิวจาก findSeoArticleJobs
 * @param filter ชนิดงาน + บทความ
 * @returns งานที่จบแล้วใบล่าสุด หรือ undefined
 * @used-by seo-article-ai-image-prompt.tsx
 */
export const findLatestDoneSeoArticleJob = (
  jobs: SeoArticleJobItem[],
  filter: SeoArticleJobFilter
): SeoArticleJobItem | undefined =>
  jobs.find(
    (job) =>
      job.jobType === filter.jobType &&
      job.status === SeoArticleJobStatus.DONE &&
      (filter.seoArticleId != null ? job.seoArticleId === filter.seoArticleId : job.seoArticleId == null)
  );
