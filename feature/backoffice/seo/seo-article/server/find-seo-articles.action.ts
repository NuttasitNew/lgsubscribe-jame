"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { Prisma, SeoArticleStatus } from "@prisma/client";

/**
 * field ที่ list ต้องใช้ — ตัด `contentJson` ออกจงใจ (บทความหนึ่งเรื่องหนักหลายสิบ KB
 * ส่งทั้งหน้ารายการทำให้ payload ของ server action บวมโดยไม่จำเป็น)
 * หน้าแก้ไขโหลดเนื้อหาเองผ่าน findSeoArticleDetail
 */
const SEO_ARTICLE_LIST_SELECT = {
  seoArticleId: true,
  status: true,
  origin: true,
  slug: true,
  title: true,
  metaDescription: true,
  keywords: true,
  targetKeyword: true,
  promptBrief: true,
  sourceDate: true,
  sourceTopics: true,
  aiModel: true,
  approvedBy: true,
  publishedAt: true,
  publishedCommitSha: true,
  rejectedReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SeoArticleSelect;

/** แถวในหน้ารายการ — เหมือน SeoArticle ทุกอย่างยกเว้นไม่มี contentJson */
export type SeoArticleListItem = Prisma.SeoArticleGetPayload<{ select: typeof SEO_ARTICLE_LIST_SELECT }>;

/** ผลลัพธ์แบบแบ่งหน้า */
export interface FindSeoArticlesResult {
  items: SeoArticleListItem[];
  total: number; // จำนวนทั้งหมดที่ตรงเงื่อนไข (ไม่ใช่เฉพาะหน้านี้)
  page: number; // หน้าปัจจุบัน (เริ่มที่ 1)
  pageSize: number; // จำนวนต่อหน้าที่ใช้จริงหลัง clamp
  pageCount: number; // จำนวนหน้าทั้งหมด (อย่างน้อย 1)
}

/** ค่าเริ่มต้น + ขอบเขตของ pageSize — กันหน้าเดียวลากทั้งตาราง */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface FindSeoArticlesParams {
  status?: SeoArticleStatus; // ไม่ส่ง = ทุกสถานะ
  page?: number; // เริ่มที่ 1 (ไม่ส่ง = 1)
  pageSize?: number; // ไม่ส่ง = 20, สูงสุด 100
  search?: string; // ค้นจาก title / slug (ต้องค้นฝั่ง server เพราะข้อมูลถูกแบ่งหน้าแล้ว)
}

/**
 * @description ดึงรายการบทความ SEO แบบแบ่งหน้าฝั่ง server (ไม่รวม contentJson)
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - `select` ตัด contentJson ทิ้ง — หน้ารายการไม่ได้ใช้ และเป็นตัวทำให้ payload บวมที่สุด
 * - นับ total กับดึงข้อมูลหน้าปัจจุบันยิงพร้อมกัน (Promise.all) ไม่ทำ 2 รอบต่อกัน
 * - page/pageSize ถูก clamp เสมอ — ค่าพังจาก client ไม่ทำให้ query พัง
 * @used-by {@link find-seo-articles.query.ts}
 * @related {@link find-seo-article-detail.action.ts}, {@link find-seo-article-overview.action.ts}
 */
export const findSeoArticles = async (
  params: FindSeoArticlesParams
): Promise<ResponsePatternType<FindSeoArticlesResult>> => {
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
    return ResponsePattern.forbidden("[SEO-ART-01] เฉพาะ super-admin เท่านั้น");
  }

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
  const search = params.search?.trim();

  const log = fileLogger.session("ดึงรายการบทความ SEO", {
    type: "R",
    id: `status=${params.status ?? "ALL"} page=${page}`,
    userName: decoded.name || "unknown",
  });

  try {
    const where: Prisma.SeoArticleWhereInput = {
      // บทความที่ถูกลบ (soft delete) ต้องไม่โผล่ในหน้ารายการ — record ยังอยู่เพื่อจอง slug + กัน AI เสนอหัวข้อซ้ำ
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { slug: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.seoArticle.count({ where }),
      prisma.seoArticle.findMany({
        where,
        select: SEO_ARTICLE_LIST_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    log.end({ result: `${items.length}/${total} เรื่อง (หน้า ${page}/${pageCount})` });
    return ResponsePattern.ok("ดึงข้อมูลสำเร็จ", { items, total, page, pageSize, pageCount });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-ART-02] ดึงรายการบทความไม่สำเร็จ");
  } finally {
    log.end();
  }
};
