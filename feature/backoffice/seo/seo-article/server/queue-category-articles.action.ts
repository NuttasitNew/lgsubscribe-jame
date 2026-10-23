"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import { scheduleSeoArticleJob } from "./schedule-seo-article-job.helper";
import prisma from "@/lib/seo/prisma";
import { SeoArticleJob, SeoArticleJobStatus } from "@prisma/client";
import { runSeoArticleJob } from "./run-seo-article-job.helper";
import { SEO_ARTICLE_TONES, type SeoArticleTone } from "../constant/seo-article-tone";
import {
  getServiceSubcategoryDefinitions,
  findCatalogCategory,
  normalizeServiceSubcategoryNames,
} from "../helper/service-subcategory.helper";

/** สั่งเขียนได้สูงสุดกี่เรื่องต่อครั้ง — AI 1 call + รูปต่อเรื่อง ถ้าปล่อยไม่จำกัดจะเผาเงินก้อนโตในคลิกเดียว */
const MAX_TOPICS_PER_REQUEST = 5;
/** ความยาวหัวข้อที่รับได้ */
const MIN_TOPIC_LENGTH = 5;
const MAX_TOPIC_LENGTH = 300;

export interface QueueCategoryArticleTopic {
  /** หัวข้อบทความที่ผู้ใช้ติ๊กเลือก */
  topic: string;
  /** primary keyword ที่ตั้งใจให้ติดอันดับ */
  targetKeyword?: string;
}

export interface QueueCategoryArticlesParams {
  /** รหัสหมวดบริการที่เลือก */
  categoryCode: string;
  /** กลุ่มบริการย่อยที่ต้องการโฟกัส; ไม่ส่ง/ว่าง = ใช้ทั้งหมวดหลัก */
  subcategoryNames?: string[];
  /** หัวข้อที่ติ๊กเลือก (1-5 หัวข้อ) */
  topics: QueueCategoryArticleTopic[];
  /** โทนการเขียน */
  tone?: SeoArticleTone;
  /** gen รูปประกอบด้วยไหม — default ปิด (รูปแพง กดสร้างทีหลังจากหน้ารีวิวได้) */
  generateImages?: boolean;
}

export interface QueueCategoryArticlesResult {
  /** งานที่เข้าคิวแล้ว */
  jobs: Pick<SeoArticleJob, "seoArticleJobId" | "topic">[];
  /** true = ไม่มี QStash (dev) จึงรัน worker ในเครื่องแทน — งานยังทำเบื้องหลังเหมือนกัน */
  ranInline: boolean;
}

/**
 * @description ขั้นที่ 2 ของการสั่งเขียนบทความตามหมวด — บันทึกงานลงคิวแล้วคืนทันที ไม่ต้องรอ AI เขียนจบ
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - เขียน 1 เรื่องใช้ ~1-2 นาที ถ้าให้ผู้ใช้รอใน server action จะกดแล้วออกจากหน้าไม่ได้เลย
 *   → บันทึก SeoArticleJob (QUEUED) 1 แถวต่อหัวข้อ → publish เข้า QStash → return ทันที (~1 วินาที)
 * - สถานะอยู่ใน DB ไม่ใช่ใน state ของหน้า เพราะผู้ใช้เปลี่ยนหน้าไปทำอย่างอื่นระหว่างรอเป็นเรื่องปกติ
 *   กลับมาแล้วต้องเห็นได้ว่าเสร็จหรือพัง (อ่านผ่าน {@link ./find-seo-article-jobs.action.ts})
 * - dev ที่ไม่มี QSTASH_TOKEN → รัน worker แบบ inline โดยไม่ await (fire-and-forget)
 *   ผู้ใช้จึงได้ประสบการณ์เดียวกันทั้ง 2 environment
 * - publish ที่ล้ม → mark job นั้นเป็น FAILED ทันที ไม่ปล่อยค้าง QUEUED ตลอดกาลจนแถบ "กำลังเขียน" ไม่หาย
 * @param params หมวด + หัวข้อที่ติ๊ก + ตัวเลือก
 * @returns รายการงานที่เข้าคิว
 * @used-by {@link ../tanstack/queue-category-articles.mutation.ts}
 * @related {@link ./run-seo-article-job.helper.ts}, {@link ../../../../../lib/qstash/schedule-seo-article-job.ts}
 */
export const queueCategoryArticles = async (
  params: QueueCategoryArticlesParams
): Promise<ResponsePatternType<QueueCategoryArticlesResult>> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("lg_backoffice_session")?.value;
  if (!authToken) return ResponsePattern.unauthorized("no auth token");

  let decoded;
  try {
    decoded = await verifyByToken(authToken);
  } catch {
    return ResponsePattern.unauthorized("Token ไม่ถูกต้องหรือหมดอายุ");
  }

  if (decoded.role !== "SUPER_ADMIN") {
    return ResponsePattern.forbidden("[SEO-QUEUE-01] เฉพาะ super-admin เท่านั้น");
  }

  const categoryCode = params.categoryCode?.trim();
  const subcategoryNames = normalizeServiceSubcategoryNames(params.subcategoryNames);
  if (!subcategoryNames) {
    return ResponsePattern.badRequest("[SEO-QUEUE-12] รูปแบบกลุ่มบริการย่อยไม่ถูกต้อง");
  }
  if (!categoryCode) {
    return ResponsePattern.badRequest("[SEO-QUEUE-02] ไม่ได้ระบุหมวดหมู่บริการ");
  }

  const topics = (params.topics ?? [])
    .map((item) => ({ topic: item.topic?.trim() ?? "", targetKeyword: item.targetKeyword?.trim() || undefined }))
    .filter((item) => item.topic.length > 0);

  if (topics.length === 0) {
    return ResponsePattern.badRequest("[SEO-QUEUE-03] ยังไม่ได้เลือกหัวข้อ");
  }
  if (topics.length > MAX_TOPICS_PER_REQUEST) {
    return ResponsePattern.badRequest(`[SEO-QUEUE-04] เลือกได้สูงสุด ${MAX_TOPICS_PER_REQUEST} หัวข้อต่อครั้ง`);
  }
  if (topics.some((item) => item.topic.length < MIN_TOPIC_LENGTH || item.topic.length > MAX_TOPIC_LENGTH)) {
    return ResponsePattern.badRequest(`[SEO-QUEUE-05] หัวข้อต้องยาว ${MIN_TOPIC_LENGTH}-${MAX_TOPIC_LENGTH} ตัวอักษร`);
  }
  if (params.tone && !SEO_ARTICLE_TONES.some((item) => item.value === params.tone)) {
    return ResponsePattern.badRequest("[SEO-QUEUE-06] โทนการเขียนไม่ถูกต้อง");
  }

  const log = fileLogger.session("สั่งเขียนบทความ SEO ตามหมวดหมู่", {
    type: "C",
    id: `seo-queue:${categoryCode}`,
    userName: decoded.name || "unknown",
  });

  try {
    const category = findCatalogCategory(categoryCode);
    if (!category) {
      return ResponsePattern.notFound("[SEO-QUEUE-07] ไม่พบหมวดสินค้านี้");
    }

    if (subcategoryNames.length > 0) {
      const definitions = getServiceSubcategoryDefinitions(categoryCode);
      const missing = subcategoryNames.filter(
        (name) => !definitions.some((definition) => definition.subcategoryName === name)
      );
      if (missing.length > 0) {
        return ResponsePattern.badRequest(`[SEO-QUEUE-11] ไม่พบรุ่นสินค้าบางรายการ (${missing.join(", ")}) ในหมวดนี้`);
      }
    }

    const jobs = await prisma.seoArticleJob.createManyAndReturn({
      data: topics.map((item) => ({
        categoryCode: category.categoryCode,
        categoryName: category.categoryName, // snapshot — หมวดเปลี่ยนชื่อแล้วประวัติงานเก่ายังอ่านรู้เรื่อง
        topic: item.topic,
        targetKeyword: item.targetKeyword ?? null,
        tone: params.tone ?? null,
        generateImages: params.generateImages ?? false,
        ...(subcategoryNames.length > 0 ? { payload: { subcategoryNames } } : {}),
        requestedBy: decoded.name || "unknown",
      })),
      select: { seoArticleJobId: true, topic: true },
    });

    // ส่งเข้าคิวพร้อมกันทั้งชุด — ห้ามวนรอทีละใบ
    const scheduled = await Promise.all(
      jobs.map((job) => scheduleSeoArticleJob({ seoArticleJobId: job.seoArticleJobId }))
    );

    // ไม่มีคิว (dev) กับ publish ล้ม (prod) ต้องแยกทางกัน — ดู reason ใน scheduleSeoArticleJob
    const inlineJobs = jobs.filter((_, index) => scheduled[index].reason === "unavailable");
    const failedJobs = jobs.filter((_, index) => scheduled[index].reason === "error");

    // dev ไม่มี QSTASH_TOKEN → รันในเครื่องแบบไม่รอผล ผู้ใช้จึงกดแล้วออกจากหน้าได้เหมือน prod
    // ความพังระหว่างเขียนถูกจับและบันทึกลง SeoArticleJob โดย runSeoArticleJob เองอยู่แล้ว
    for (const job of inlineJobs) {
      void runSeoArticleJob(job.seoArticleJobId).catch((error) => {
        console.error(`[SEO-QUEUE-08] รัน inline ไม่สำเร็จ job=${job.seoArticleJobId}:`, error);
      });
    }

    // publish ล้มทั้งที่มีคิว → ปิดงานเป็น FAILED ทันที ห้ามรัน inline ต่อ (serverless อาจถูกฆ่ากลางทาง
    // จนงานค้าง RUNNING ตลอดกาล) และห้ามปล่อยค้าง QUEUED จนแถบ "กำลังเขียน" ไม่มีวันหาย
    if (failedJobs.length > 0) {
      await prisma.seoArticleJob.updateMany({
        where: { seoArticleJobId: { in: failedJobs.map((job) => job.seoArticleJobId) } },
        data: {
          status: SeoArticleJobStatus.FAILED,
          errorMessage: "[SEO-QUEUE-10] ส่งงานเข้าคิวไม่สำเร็จ — กดสั่งเขียนใหม่อีกครั้ง",
          finishedAt: new Date(),
        },
      });
    }

    const acceptedCount = jobs.length - failedJobs.length;
    log.end({
      result: `เข้าคิว ${acceptedCount}/${jobs.length} เรื่อง${inlineJobs.length > 0 ? " (inline)" : ""}`,
    });

    if (acceptedCount === 0) {
      return ResponsePattern.error("[SEO-QUEUE-10] ส่งงานเข้าคิวไม่สำเร็จ — ลองใหม่อีกครั้ง");
    }

    const message =
      failedJobs.length > 0
        ? `สั่งเขียน ${acceptedCount} เรื่องแล้ว (อีก ${failedJobs.length} เรื่องส่งเข้าคิวไม่สำเร็จ) — ออกจากหน้านี้ได้เลย`
        : `สั่งเขียน ${acceptedCount} เรื่องแล้ว — ทำงานเบื้องหลัง ออกจากหน้านี้ได้เลย`;

    return ResponsePattern.ok(message, { jobs, ranInline: inlineJobs.length > 0 });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-QUEUE-09] สั่งเขียนบทความไม่สำเร็จ");
  } finally {
    log.end();
  }
};
