"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { revalidateBlog } from "./public-blog-article.helper";
import { Prisma, SeoArticle, SeoArticleStatus } from "@prisma/client";
import { seoArticleBlockContentSchema } from "../constant/seo-article-block-schema";
import { markUsedArticleImages } from "./mark-used-article-images.helper";
import type { SeoArticleBlockContent } from "../type/seo-article-block.type";

/** meta ของบทความ (ทุก field ที่ไม่ได้อยู่ใน contentJson) */
const saveSeoArticleMetaSchema = z.object({
  seoArticleId: z.number().int().positive(),
  title: z.string().trim().min(1, "ต้องมีชื่อบทความ").max(200, "ชื่อบทความยาวเกิน 200 ตัวอักษร"),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug ต้องเป็น kebab-case ภาษาอังกฤษเท่านั้น")
    .max(120, "slug ยาวเกิน 120 ตัวอักษร"),
  metaDescription: z
    .string()
    .trim()
    .min(1, "ต้องมี meta description")
    .max(320, "meta description ยาวเกิน 320 ตัวอักษร"),
  keywords: z.array(z.string().trim().min(1, "keyword ว่างไม่ได้")).min(1, "ต้องมีอย่างน้อย 1 keyword"),
  targetKeyword: z.string().trim().min(1).nullish(),
});

/**
 * meta ฉบับภาษาอังกฤษ — ทุก field optional เพราะบทความไทยล้วนคือเคสปกติ
 * ⚠️ ไม่มี .min(1) ที่ระดับ string: ช่องว่างเปล่าจาก editor = "แอดมินไม่ได้กรอก" ไม่ใช่ error
 *    เก็บลง DB เป็น null (ดู emptyToNull) — ห้ามเก็บ "" เพราะ buildHurryWebBlogFile ใช้
 *    "มี titleEn ไหม" ตัดสินว่าจะแนบ key `en` ลงไฟล์บนเว็บ
 */
const saveSeoArticleEnSchema = z.object({
  titleEn: z.string().trim().max(200, "ชื่อบทความ EN ยาวเกิน 200 ตัวอักษร").nullish(),
  metaDescriptionEn: z.string().trim().max(320, "meta description EN ยาวเกิน 320 ตัวอักษร").nullish(),
  keywordsEn: z.array(z.string().trim()).nullish(),
});

/** string ที่ trim แล้วว่าง/null/undefined → null (DB เก็บ null เท่านั้น ห้ามเก็บ "") */
const emptyToNull = (value: string | null | undefined): string | null => (value?.trim() ? value.trim() : null);

/** สถานะที่ยังแก้ไขเนื้อหาได้ — PUBLISHED แก้ได้ และหน้าเว็บอัปเดตทันทีที่บันทึก */
const EDITABLE_STATUSES: SeoArticleStatus[] = [SeoArticleStatus.DRAFT, SeoArticleStatus.PUBLISHED];

export interface SaveSeoArticleParams {
  seoArticleId: number;
  title: string;
  slug: string;
  metaDescription: string;
  keywords: string[];
  targetKeyword?: string | null;
  titleEn?: string | null; // meta EN — ว่าง = บทความไทยล้วน (/en/blog/<slug> จะ 404)
  metaDescriptionEn?: string | null;
  keywordsEn?: string[] | null;
  contentJson: SeoArticleBlockContent; // โครง block v2 จาก editor
  expectedUpdatedAt: Date | string; // updatedAt ที่ client ถืออยู่ (optimistic concurrency)
}

/** ข้อความ error จาก zod แบบสั้น — เอา issue แรกพอ (UI แสดงทีละบรรทัด) */
const firstIssueMessage = (error: z.ZodError): string => {
  const issue = error.issues[0];
  if (!issue) return "ข้อมูลไม่ถูกต้อง";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
};

/**
 * @description บันทึกบทความ SEO (meta + เนื้อหาโครง block) — ใช้แทน updateSeoArticle เดิม
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * 1. validate meta + contentJson ด้วย zod (seoArticleBlockContentSchema) — ไม่ผ่าน = ไม่แตะ DB เลย
 * 2. แก้ได้ทั้ง DRAFT และ PUBLISHED (บทความที่เผยแพร่แล้วแก้เสร็จต้องกดเผยแพร่ซ้ำถึงจะขึ้นเว็บ)
 *    — REJECTED/APPROVED แก้ไม่ได้
 * 3. บทความ PUBLISHED ห้ามเปลี่ยน slug — ไฟล์บนเว็บผูกกับ slug เดิมและ Google index ไปแล้ว
 *    เปลี่ยนแล้วจะได้ไฟล์ใหม่ทิ้งไฟล์เก่าค้าง (404 + เสียอันดับ)
 * 4. optimistic concurrency: UPDATE ... WHERE updatedAt = expectedUpdatedAt — ไม่โดนแถวไหน = มีคนแก้แซง
 *    คืน [SEO-SAVE-06] ให้ client refetch แล้วให้ผู้ใช้ตัดสินใจใหม่
 * 5. คืนแถวใหม่ทั้งแถว (มี updatedAt ใหม่) — client ต้องเก็บไปใช้เป็น expectedUpdatedAt ของการเซฟครั้งถัดไป
 * 6. meta EN (titleEn/metaDescriptionEn/keywordsEn) optional ทั้งชุด — trim แล้วว่าง = เก็บ null
 *    เพราะตอน publish ใช้ "มี titleEn + metaDescriptionEn ครบคู่ไหม" ตัดสินว่าจะแนบ key `en`
 *    ลงไฟล์บนเว็บ (มี = /en/blog/<slug> เสิร์ฟได้ / ไม่มี = 404 กัน duplicate content)
 *    ถ้าเก็บ "" ไว้ บทความไทยล้วนจะถูกมองว่ามีฉบับ EN แล้วเปิดหน้า EN เปล่าออกมา
 * @used-by {@link save-seo-article.mutation.ts}
 * @related {@link ../constant/seo-article-block-schema.ts}, {@link publish-seo-article.action.ts}
 */
export const saveSeoArticle = async (params: SaveSeoArticleParams): Promise<ResponsePatternType<SeoArticle>> => {
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
    return ResponsePattern.forbidden("[SEO-SAVE-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("บันทึกบทความ SEO", {
    type: "U",
    id: `SEO:${params.seoArticleId}`,
    userName: decoded.name || "unknown",
  });

  try {
    const metaResult = saveSeoArticleMetaSchema.safeParse({
      seoArticleId: params.seoArticleId,
      title: params.title,
      slug: params.slug,
      metaDescription: params.metaDescription,
      keywords: params.keywords,
      targetKeyword: params.targetKeyword,
    });
    if (!metaResult.success) {
      log.error(`meta ไม่ผ่าน: ${firstIssueMessage(metaResult.error)}`);
      return ResponsePattern.validationError(`[SEO-SAVE-02] ${firstIssueMessage(metaResult.error)}`);
    }

    const enResult = saveSeoArticleEnSchema.safeParse({
      titleEn: params.titleEn,
      metaDescriptionEn: params.metaDescriptionEn,
      keywordsEn: params.keywordsEn,
    });
    if (!enResult.success) {
      log.error(`meta EN ไม่ผ่าน: ${firstIssueMessage(enResult.error)}`);
      return ResponsePattern.validationError(`[SEO-ART-27] ${firstIssueMessage(enResult.error)}`);
    }

    const contentResult = seoArticleBlockContentSchema.safeParse(params.contentJson);
    if (!contentResult.success) {
      log.error(`โครงเนื้อหาไม่ผ่าน: ${firstIssueMessage(contentResult.error)}`);
      return ResponsePattern.validationError(
        `[SEO-SAVE-03] โครงเนื้อหาไม่ถูกต้อง — ${firstIssueMessage(contentResult.error)}`
      );
    }

    const expectedUpdatedAt = new Date(params.expectedUpdatedAt);
    if (Number.isNaN(expectedUpdatedAt.getTime())) {
      log.error("expectedUpdatedAt ไม่ใช่วันที่");
      return ResponsePattern.validationError(
        "[SEO-SAVE-09] ข้อมูลเวอร์ชันบทความไม่ถูกต้อง — โหลดบทความใหม่แล้วลองอีกครั้ง"
      );
    }

    const existing = await prisma.seoArticle.findUnique({
      where: { seoArticleId: params.seoArticleId },
      select: { status: true, slug: true, updatedAt: true },
    });
    if (!existing) {
      log.error("ไม่พบบทความ");
      return ResponsePattern.notFound("[SEO-SAVE-04] ไม่พบบทความ");
    }
    if (!EDITABLE_STATUSES.includes(existing.status)) {
      log.error(`แก้ไม่ได้ status=${existing.status}`);
      return ResponsePattern.badRequest("[SEO-SAVE-05] แก้ไขได้เฉพาะร่าง (DRAFT) และบทความที่เผยแพร่แล้ว (PUBLISHED)");
    }
    if (existing.status === SeoArticleStatus.PUBLISHED && existing.slug !== metaResult.data.slug) {
      log.error(`ห้ามเปลี่ยน slug ของบทความที่เผยแพร่แล้ว ${existing.slug} → ${metaResult.data.slug}`);
      return ResponsePattern.badRequest(
        "[SEO-SAVE-08] บทความที่เผยแพร่แล้วเปลี่ยน slug ไม่ได้ — URL เดิมถูก Google เก็บไปแล้ว"
      );
    }

    // optimistic concurrency — โดน 0 แถว = มีคนบันทึกแซงหลังจาก client โหลดไป
    const updated = await prisma.seoArticle.updateMany({
      where: { seoArticleId: params.seoArticleId, updatedAt: expectedUpdatedAt },
      data: {
        title: metaResult.data.title,
        slug: metaResult.data.slug,
        metaDescription: metaResult.data.metaDescription,
        keywords: metaResult.data.keywords,
        ...(metaResult.data.targetKeyword !== undefined ? { targetKeyword: metaResult.data.targetKeyword } : {}),
        titleEn: emptyToNull(enResult.data.titleEn),
        metaDescriptionEn: emptyToNull(enResult.data.metaDescriptionEn),
        keywordsEn: (enResult.data.keywordsEn ?? []).filter((keyword) => keyword.length > 0),
        contentJson: contentResult.data as object,
        contentUpdatedAt: new Date(),
        // ร่างถูกย้ายขึ้นเป็นเนื้อจริงแล้ว ต้องล้างทิ้งในธุรกรรมเดียวกัน
        // ไม่งั้นเปิดหน้าใหม่จะเจอร่างเดิมค้างอยู่ทั้งที่บันทึกไปแล้ว แล้วขึ้นป้าย "มีร่างค้าง" หลอก ๆ
        draftJson: Prisma.DbNull,
        draftSavedAt: null,
        draftSavedBy: null,
      },
    });
    if (updated.count === 0) {
      log.error(`ชนกัน expected=${expectedUpdatedAt.toISOString()} actual=${existing.updatedAt.toISOString()}`);
      return ResponsePattern.badRequest(
        "[SEO-SAVE-06] มีคนอื่นบันทึกบทความนี้ไปแล้ว — กดโหลดใหม่เพื่อดูฉบับล่าสุดก่อนแก้ต่อ"
      );
    }

    // ประทับว่ารูปใบไหนถูกใช้จริงในฉบับที่เพิ่งบันทึก — แถบคลังรูปใช้แยกใบที่ "วาดทิ้งไว้เฉย ๆ" ออกมา
    // ทำหลังบันทึกสำเร็จเท่านั้น และล้มเหลวแล้วกลืน: ป้ายกำกับพังไม่คุ้มกับการทำให้การบันทึกบทความล้ม
    await markUsedArticleImages(contentResult.data).catch(() => undefined);

    const result = await prisma.seoArticle.findUniqueOrThrow({ where: { seoArticleId: params.seoArticleId } });

    // หน้าเว็บอ่านจากฐานข้อมูล — บทความที่เผยแพร่แล้วจะเห็นเนื้อใหม่ทันทีหลัง revalidate
    if (existing.status === SeoArticleStatus.PUBLISHED) revalidateBlog(existing.slug);

    log.end({ result: `SEO:${params.seoArticleId} blocks=${contentResult.data.blocks.length}` });
    return ResponsePattern.ok("บันทึกบทความสำเร็จ", result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      log.error(`slug ซ้ำ: ${params.slug}`);
      return ResponsePattern.badRequest("[SEO-SAVE-07] slug นี้ถูกใช้กับบทความอื่นแล้ว — เปลี่ยน slug แล้วลองใหม่");
    }
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-SAVE-10] บันทึกบทความไม่สำเร็จ");
  } finally {
    log.end();
  }
};
