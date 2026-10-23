"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { SeoArticleJobStatus, SeoArticleJobType } from "@prisma/client";
import { enqueueSeoArticleJob } from "./enqueue-seo-article-job.helper";
import { SEO_ARTICLE_TONES, type SeoArticleTone } from "../constant/seo-article-tone";
import type { SeoArticleSingleImagePayload, SeoArticleWriteNowPayload } from "../type/seo-article-job-payload.type";
import type { SeoArticleCategory } from "../type/seo-article-content.type";
import type { AskAnswerFaqWritePayload } from "../../ask-answer-faq/type/ask-answer-faq-job-payload.type";
import { MAX_FAQ_COUNT } from "../../ask-answer-faq/server/write-ask-answer-faqs.helper";

/** ระยะกันกดรัวงานวาดรูปต่อคน (วินาที) — gpt-image-2 คิดเงินต่อใบ ปุ่มค้าง/กดซ้ำต้องไม่กลายเป็นค่า API หลายเท่า */
const IMAGE_LOCK_SECONDS = 20;
/** ความยาวโจทย์ที่รับได้ — สั้นไปสั่งงานไม่รู้เรื่อง ยาวไปเปลือง token */
const MIN_BRIEF_LENGTH = 5;
const MAX_BRIEF_LENGTH = 2000;
/** ป้ายชื่องานบนแถบสถานะ — ยาวกว่านี้แถบจะเละ */
const MAX_LABEL_LENGTH = 120;

const CATEGORIES: SeoArticleCategory[] = ["productGuide", "buyingGuide", "careTips", "services"];

/** ชนิดงานที่เข้าคิวผ่าน action นี้ได้ — WRITE_CATEGORY มี action ของตัวเองเพราะสั่งทีละหลายหัวข้อพร้อมกัน */
export type QueueableSeoArticleJobType = Exclude<SeoArticleJobType, "WRITE_CATEGORY">;

/** ชนิดงานที่ไม่ผูกกับบทความเรื่องใดเรื่องหนึ่ง — งานของหน้า /ask-and-answer (ทั้งเว็บมีหน้าเดียว) */
const PAGE_LEVEL_JOB_TYPES: QueueableSeoArticleJobType[] = [
  SeoArticleJobType.WRITE_FAQ,
  SeoArticleJobType.TRANSLATE_FAQ_EN,
];

/** ป้ายชื่อบนแถบสถานะของงานระดับหน้า — งานพวกนี้ไม่มีชื่อบทความให้ใช้ */
const PAGE_LEVEL_JOB_LABEL: Partial<Record<QueueableSeoArticleJobType, string>> = {
  [SeoArticleJobType.WRITE_FAQ]: "คิดคำถามใหม่ให้หน้า ถาม-ตอบ",
  [SeoArticleJobType.TRANSLATE_FAQ_EN]: "แปลหน้า ถาม-ตอบ เป็นอังกฤษ",
};

export interface QueueSeoArticleJobParams {
  jobType: QueueableSeoArticleJobType;
  /** บทความต้นทาง — บังคับทุกชนิดยกเว้น WRITE_NOW และงานระดับหน้า (WRITE_FAQ / TRANSLATE_FAQ_EN) */
  seoArticleId?: number;
  /** โทนการเขียน (เฉพาะ WRITE_NOW) */
  tone?: SeoArticleTone;
  /** gen รูปประกอบด้วยไหม (เฉพาะ WRITE_NOW) */
  generateImages?: boolean;
  /** พารามิเตอร์เฉพาะชนิดงาน */
  payload?: SeoArticleWriteNowPayload | SeoArticleSingleImagePayload | AskAnswerFaqWritePayload;
}

export interface QueueSeoArticleJobResult {
  seoArticleJobId: number;
  /** true = ไม่มี QStash (dev) จึงรัน worker ในเครื่องแทน — งานยังทำเบื้องหลังเหมือนกัน */
  ranInline: boolean;
}

/**
 * @description ส่งงาน AI ของหน้า SEO Article เข้าคิวแล้วคืนทันที — ใช้ร่วมกันทุกปุ่มยกเว้น "เขียนตามหมวด"
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - ทุกงานในหน้านี้ใช้เวลา 20 วินาที - หลายนาที ถ้าให้รอใน server action ผู้ใช้จะออกจากหน้าไม่ได้เลย
 *   → CREATE SeoArticleJob (QUEUED) → publish QStash → return ทันที (~1 วินาที)
 *   สถานะอยู่ใน DB ปุ่มจึงยังหมุนต่อได้แม้ผู้ใช้จะสลับหน้าไปแล้วกลับมา หรือปิดเบราว์เซอร์ไปเลย
 * - **กันสั่งซ้ำ**: บทความ 1 เรื่องมีงานชนิดเดียวกันค้างได้ทีละใบ (ยกเว้น SINGLE_IMAGE ที่ตั้งใจให้
 *   วาดหลายบล็อกพร้อมกันได้ — กันด้วย Redis lock รายคนแทน) ไม่งั้นกดรัว = จ่ายค่า AI ซ้ำและผลทับกันเอง
 * - publish ที่ล้ม → mark job เป็น FAILED ทันที ไม่ปล่อยค้าง QUEUED ตลอดกาลจนแถบสถานะไม่หาย
 * - dev ที่ไม่มี QSTASH_TOKEN → รัน worker inline โดยไม่ await (fire-and-forget) ให้ประสบการณ์เหมือน prod
 * @param params ชนิดงาน + บทความ + พารามิเตอร์เฉพาะชนิด
 * @returns เลข job ที่เข้าคิว
 * @used-by {@link ../tanstack/queue-seo-article-job.mutation.ts}
 * @related {@link ./run-seo-article-job.helper.ts}, {@link ./queue-category-articles.action.ts}
 */
export const queueSeoArticleJob = async (
  params: QueueSeoArticleJobParams
): Promise<ResponsePatternType<QueueSeoArticleJobResult>> => {
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
    return ResponsePattern.forbidden("[SEO-JOBQ-01] เฉพาะ super-admin เท่านั้น");
  }

  const requestedBy = decoded.name || "unknown";
  const { jobType } = params;

  // ── ตรวจ input ต่อชนิดงาน + ประกอบป้ายชื่อที่จะโชว์บนแถบสถานะ ─────────────────────
  let label: string;
  let tone: string | null = null;
  let generateImages = false;
  let payload: SeoArticleWriteNowPayload | SeoArticleSingleImagePayload | AskAnswerFaqWritePayload | null = null;

  if (PAGE_LEVEL_JOB_TYPES.includes(jobType)) {
    // งานของหน้า /ask-and-answer — ทั้งเว็บมีหน้าเดียว จึงไม่มี seoArticleId และกันซ้ำแบบ "ทั้งระบบทีละใบ"
    // (ไม่ใช่ทีละบทความเหมือนงานอื่น) ไม่งั้น 2 งานที่วิ่งพร้อมกันจะ push ทับไฟล์เดียวกันจนคำแปลหาย
    const running = await prisma.seoArticleJob.findFirst({
      where: { jobType, status: { in: [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING] } },
      select: { seoArticleJobId: true },
    });
    if (running) {
      return ResponsePattern.badRequest(
        "[SEO-JOBQ-17] งานเดิมของหน้า ถาม-ตอบ ยังไม่จบ — รอให้เสร็จก่อนแล้วค่อยสั่งใหม่"
      );
    }

    label = PAGE_LEVEL_JOB_LABEL[jobType] ?? "งานหน้า ถาม-ตอบ";

    if (jobType === SeoArticleJobType.WRITE_FAQ) {
      const faqPayload = (params.payload ?? {}) as AskAnswerFaqWritePayload;
      const count = faqPayload.count;
      if (count != null && (!Number.isInteger(count) || count < 1 || count > MAX_FAQ_COUNT)) {
        return ResponsePattern.badRequest(`[SEO-JOBQ-18] จำนวนคำถามต้องเป็น 1-${MAX_FAQ_COUNT} ข้อ`);
      }
      payload = count != null ? { count } : {};
    }
  } else if (jobType === SeoArticleJobType.WRITE_NOW) {
    const writeNow = (params.payload ?? {}) as SeoArticleWriteNowPayload;
    if (writeNow.promptBrief !== undefined && typeof writeNow.promptBrief !== "string") {
      return ResponsePattern.badRequest("[SEO-JOBQ-02] โจทย์ต้องเป็นข้อความ");
    }
    const promptBrief = writeNow.promptBrief?.trim();

    if (writeNow.promptBrief !== undefined && (promptBrief?.length ?? 0) < MIN_BRIEF_LENGTH) {
      return ResponsePattern.badRequest(`[SEO-JOBQ-02] โจทย์สั้นเกินไป — พิมพ์อย่างน้อย ${MIN_BRIEF_LENGTH} ตัวอักษร`);
    }
    if (promptBrief && promptBrief.length > MAX_BRIEF_LENGTH) {
      return ResponsePattern.badRequest(`[SEO-JOBQ-03] โจทย์ยาวเกินไป — ไม่เกิน ${MAX_BRIEF_LENGTH} ตัวอักษร`);
    }
    if (writeNow.category && !CATEGORIES.includes(writeNow.category)) {
      return ResponsePattern.badRequest("[SEO-JOBQ-04] หมวดบทความไม่ถูกต้อง");
    }
    if (params.tone && !SEO_ARTICLE_TONES.some((item) => item.value === params.tone)) {
      return ResponsePattern.badRequest("[SEO-JOBQ-05] โทนการเขียนไม่ถูกต้อง");
    }

    // เขียนบทความใหม่ทีละใบพอ — กดรัวก่อนปุ่มทันอัปเดต = ได้บทความซ้ำ 2 เรื่อง + จ่ายค่า AI 2 เท่า
    const running = await prisma.seoArticleJob.findFirst({
      where: {
        jobType: SeoArticleJobType.WRITE_NOW,
        status: { in: [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING] },
      },
      select: { seoArticleJobId: true },
    });
    if (running) {
      return ResponsePattern.badRequest("[SEO-JOBQ-15] มีงานเขียนบทความค้างอยู่ — รอให้จบก่อนแล้วค่อยสั่งใหม่");
    }

    label = promptBrief ? promptBrief.slice(0, MAX_LABEL_LENGTH) : "หัวข้อจากแชทเมื่อวาน";
    tone = params.tone ?? null;
    generateImages = params.generateImages ?? false;
    payload = {
      ...(promptBrief ? { promptBrief } : {}),
      ...(writeNow.targetKeyword?.trim() ? { targetKeyword: writeNow.targetKeyword.trim() } : {}),
      ...(writeNow.category ? { category: writeNow.category } : {}),
    };
  } else {
    // งานที่เหลือผูกกับบทความที่มีอยู่แล้วทั้งหมด — ต้องมี seoArticleId เสมอ
    if (!params.seoArticleId) {
      return ResponsePattern.badRequest("[SEO-JOBQ-06] ไม่ได้ระบุบทความ");
    }

    const article = await prisma.seoArticle.findFirst({
      where: { seoArticleId: params.seoArticleId, deletedAt: null },
      select: { title: true },
    });
    if (!article) return ResponsePattern.notFound("[SEO-JOBQ-07] ไม่พบบทความ");

    label = article.title.slice(0, MAX_LABEL_LENGTH);

    if (jobType === SeoArticleJobType.SINGLE_IMAGE) {
      const image = (params.payload ?? {}) as SeoArticleSingleImagePayload;
      if (image.placement !== "cover" && image.placement !== "inline") {
        return ResponsePattern.badRequest("[SEO-JOBQ-08] ตำแหน่งรูปไม่ถูกต้อง");
      }

      // กันกดรัว — ดูจากคิวในฐานข้อมูลแทน Redis: คนเดิมเพิ่งสั่งวาดในไม่กี่วินาทีที่ผ่านมา = ปัดตก
      const recentImageJob = await prisma.seoArticleJob.findFirst({
        where: {
          jobType: SeoArticleJobType.SINGLE_IMAGE,
          requestedBy,
          createdAt: { gte: new Date(Date.now() - IMAGE_LOCK_SECONDS * 1000) },
        },
        select: { seoArticleJobId: true },
      });
      if (recentImageJob) {
        return ResponsePattern.badRequest(
          `[SEO-JOBQ-10] เพิ่งสั่งวาดไปเมื่อครู่ — รออีกสักครู่ (ไม่เกิน ${IMAGE_LOCK_SECONDS} วินาที) แล้วค่อยสั่งใหม่`
        );
      }

      payload = {
        ...(image.description?.trim() ? { description: image.description.trim() } : {}),
        ...(image.nearbyHeading ? { nearbyHeading: image.nearbyHeading } : {}),
        ...(image.nearbyText ? { nearbyText: image.nearbyText } : {}),
        placement: image.placement,
        ...(image.style ? { style: image.style } : {}),
      };
    } else {
      // gen รูปยกชุด / แปล EN เขียนทับผลของกันเองได้ถ้ามี 2 ใบวิ่งพร้อมกัน → อนุญาตทีละใบต่อบทความ
      const running = await prisma.seoArticleJob.findFirst({
        where: {
          jobType,
          seoArticleId: params.seoArticleId,
          status: { in: [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING] },
        },
        select: { seoArticleJobId: true },
      });
      if (running) {
        return ResponsePattern.badRequest("[SEO-JOBQ-11] บทความนี้มีงานเดิมค้างอยู่ — รอให้จบก่อนแล้วค่อยสั่งใหม่");
      }
    }
  }

  const log = fileLogger.session(`เข้าคิวงาน AI บทความ (${jobType})`, {
    type: "C",
    id: params.seoArticleId ? `SEO:${params.seoArticleId}` : "seo-article-now",
    userName: requestedBy,
  });

  try {
    // ตรรกะ "สร้างแถวงาน + publish + จัดการตอน publish ล้ม/ไม่มีคิว" อยู่ที่ helper กลางที่เดียว
    // (cron และ runner ที่ต่อคิวงานต่อก็เรียกตัวเดียวกัน — ไม่มีทางที่สองเส้นทางจะเพี้ยนจากกัน)
    const queued = await enqueueSeoArticleJob({
      jobType,
      label,
      requestedBy,
      tone,
      generateImages,
      ...(params.seoArticleId ? { seoArticleId: params.seoArticleId } : {}),
      ...(payload ? { payload } : {}),
    });

    if (queued.failed) {
      log.error(`publish ล้ม: ${queued.error}`);
      return ResponsePattern.error("[SEO-JOBQ-12] ส่งงานเข้าคิวไม่สำเร็จ — ลองใหม่อีกครั้ง");
    }

    log.end({ result: `job=${queued.seoArticleJobId}${queued.ranInline ? " (inline)" : ""}` });
    return ResponsePattern.ok("รับงานแล้ว — ทำงานเบื้องหลัง ออกจากหน้านี้ได้เลย", {
      seoArticleJobId: queued.seoArticleJobId,
      ranInline: queued.ranInline,
    });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-JOBQ-14] ส่งงานเข้าคิวไม่สำเร็จ");
  } finally {
    log.end();
  }
};
