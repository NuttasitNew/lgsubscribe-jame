import "server-only";
import type { SeoArticleJob } from "@prisma/client";
import type { SeoArticleJobResult } from "../type/seo-article-job-result.type";

/**
 * @description สัญญาร่วมของ runner ทุกชนิดในคิว AI ของหน้า SEO Article
 * @logic
 * - runner **โยน Error เมื่อพัง** ไม่ใช่คืน ResponsePattern — ตัวจัดคิว (run-seo-article-job.helper.ts)
 *   เป็นคนเดียวที่แปลงความพังเป็น status=FAILED + errorMessage ให้ทุกชนิดเหมือนกัน
 *   ข้อความใน Error จะไปโผล่บนหน้าจอผู้ใช้ตรง ๆ จึงต้องเขียนให้คนอ่านรู้เรื่อง + มี error code
 * - runner ไม่แตะสถานะ job เอง (ไม่ update status/finishedAt) — เจ้าของสถานะมีคนเดียวคือตัวจัดคิว
 * @used-by {@link ./run-seo-article-job.helper.ts}
 */
export interface SeoArticleJobRunOutput {
  /** บทความที่เกี่ยวข้องกับงานนี้ — งานเขียน = เรื่องที่เพิ่งเขียนได้, งานอื่น = เรื่องต้นทาง */
  seoArticleId?: number;
  /** ชื่อบทความ — ใช้ในข้อความแจ้ง LINE ตอนงานจบ */
  title?: string;
  /** ผลที่หน้าจอต้องเอาไปใช้ต่อ (มีเฉพาะ SINGLE_IMAGE) */
  resultJson?: SeoArticleJobResult;
}

/** runner 1 ชนิดงาน — รับ job ทั้งแถวเพราะ input ของแต่ละชนิดกระจายอยู่คนละคอลัมน์ */
export type SeoArticleJobRunner = (job: SeoArticleJob) => Promise<SeoArticleJobRunOutput>;
