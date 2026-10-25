"use server";

import { Prisma, SeoArticleJobStatus, SeoArticleJobType, SeoKeywordArticleType, SeoKeywordStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";
import { ResponsePattern, type ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { normalizeSearchTerm } from "@/lib/seo/helper/normalize-search-term";
import { isGscConfigured } from "@/lib/gsc/client";
import { syncKeywordRanks, type SyncKeywordRanksResult } from "@/lib/gsc/sync-keyword-ranks.helper";
import { enqueueSeoArticleJob } from "../../seo-article/server/enqueue-seo-article-job.helper";
import { requireSeoManager } from "./require-seo-manager.helper";

const deny = (auth: { status: 401 | 403; message: string }) =>
  auth.status === 401 ? ResponsePattern.unauthorized(auth.message) : ResponsePattern.forbidden(auth.message);

/** มีงานชนิดนี้ค้างอยู่ไหม (กันกดรัว = จ่ายค่าค้นเว็บซ้ำ) */
const hasActiveJob = async (jobType: SeoArticleJobType, seoKeywordId?: number) => {
  const active = await prisma.seoArticleJob.findMany({
    where: { jobType, status: { in: [SeoArticleJobStatus.QUEUED, SeoArticleJobStatus.RUNNING] } },
    select: { payload: true },
  });
  if (seoKeywordId == null) return active.length > 0;
  return active.some((job) => (job.payload as { seoKeywordId?: number } | null)?.seoKeywordId === seoKeywordId);
};

/**
 * @description สั่ง AI ตัวแรก research คำค้นของกลุ่มลูกค้า (เข้าคิว RESEARCH_KEYWORDS)
 * @access seo.manage
 * @logic ทั้งระบบรันได้ทีละงาน — 2 งานพร้อมกันจะเสนอคำซ้ำกันเองและเสียค่าค้นเว็บ 2 เท่า
 */
export const queueKeywordResearch = async (params: { focus?: string }): Promise<ResponsePatternType<{ seoArticleJobId: number }>> => {
  const auth = await requireSeoManager();
  if (!auth.ok) return deny(auth);
  const focus = params.focus?.trim().slice(0, 120);
  if (await hasActiveJob(SeoArticleJobType.RESEARCH_KEYWORDS)) {
    return ResponsePattern.badRequest("[SEO-KW-10] งาน research เดิมยังไม่จบ — รอให้เสร็จก่อน");
  }
  const queued = await enqueueSeoArticleJob({
    jobType: SeoArticleJobType.RESEARCH_KEYWORDS,
    label: focus ? `research คำค้น: ${focus}` : "research คำค้นของกลุ่มลูกค้า",
    requestedBy: auth.name,
    payload: focus ? { focus } : {},
  });
  if (queued.failed) return ResponsePattern.error("[SEO-KW-11] ส่งงานเข้าคิวไม่สำเร็จ — ลองใหม่");
  return ResponsePattern.ok("เริ่ม research คำค้นแล้ว (ใช้เวลาประมาณ 2-4 นาที)", { seoArticleJobId: queued.seoArticleJobId });
};

/**
 * @description สั่ง AI ตัวที่สอง: อ่านบทความอันดับต้นของคำนี้ → หาช่องโหว่ → (เก็บตารางเทียบ) → เขียนร่าง + รูป
 * @access seo.manage
 */
export const queueWriteFromKeyword = async (params: {
  seoKeywordId: number;
  generateImages: boolean;
}): Promise<ResponsePatternType<{ seoArticleJobId: number }>> => {
  const auth = await requireSeoManager();
  if (!auth.ok) return deny(auth);
  const keyword = await prisma.seoKeyword.findUnique({ where: { seoKeywordId: params.seoKeywordId } });
  if (!keyword) return ResponsePattern.notFound("[SEO-KW-12] ไม่พบคำค้นนี้");
  if (await hasActiveJob(SeoArticleJobType.WRITE_FROM_KEYWORD, keyword.seoKeywordId)) {
    return ResponsePattern.badRequest("[SEO-KW-13] คำนี้กำลังเขียนอยู่แล้ว");
  }
  const queued = await enqueueSeoArticleJob({
    jobType: SeoArticleJobType.WRITE_FROM_KEYWORD,
    label: keyword.keyword,
    requestedBy: auth.name,
    generateImages: params.generateImages,
    payload: { seoKeywordId: keyword.seoKeywordId },
  });
  if (queued.failed) return ResponsePattern.error("[SEO-KW-11] ส่งงานเข้าคิวไม่สำเร็จ — ลองใหม่");
  return ResponsePattern.ok("เริ่มวิเคราะห์คู่แข่งและเขียนร่างแล้ว (ใช้เวลาประมาณ 3-6 นาที)", {
    seoArticleJobId: queued.seoArticleJobId,
  });
};

/**
 * @description เปลี่ยนสถานะ/ชนิดบทความของคำค้น — เล่น (TRACKING) / ไม่เอา (DISMISSED) / กลับเป็นข้อเสนอ
 * @access seo.manage
 * @logic DISMISSED ไม่ลบแถว เพื่อให้ AI research รอบหน้าไม่เสนอคำเดิมวนกลับมา
 */
export const updateSeoKeyword = async (params: {
  seoKeywordId: number;
  status?: SeoKeywordStatus;
  articleType?: SeoKeywordArticleType;
  seoArticleId?: number | null;
}): Promise<ResponsePatternType<null>> => {
  const auth = await requireSeoManager();
  if (!auth.ok) return deny(auth);
  if (params.status && !Object.values(SeoKeywordStatus).includes(params.status)) {
    return ResponsePattern.badRequest("[SEO-KW-14] สถานะไม่ถูกต้อง");
  }
  if (params.articleType && !Object.values(SeoKeywordArticleType).includes(params.articleType)) {
    return ResponsePattern.badRequest("[SEO-KW-15] ชนิดบทความไม่ถูกต้อง");
  }
  await prisma.seoKeyword.update({
    where: { seoKeywordId: params.seoKeywordId },
    data: {
      ...(params.status ? { status: params.status } : {}),
      // เปลี่ยนชนิดบทความ = ผล research เดิมใช้ไม่ได้ (SERP ล้วน vs ตารางเทียบ)
      ...(params.articleType ? { articleType: params.articleType, serpBrief: Prisma.DbNull, serpAnalyzedAt: null } : {}),
      ...(params.seoArticleId !== undefined ? { seoArticleId: params.seoArticleId } : {}),
    },
  });
  return ResponsePattern.ok("บันทึกแล้ว", null);
};

/**
 * @description เพิ่มคำค้นที่อยากเล่นเอง (ไม่ผ่าน AI research) — เริ่มติดตามอันดับทันที
 * @access seo.manage
 */
export const createSeoKeyword = async (params: {
  keyword: string;
  articleType: SeoKeywordArticleType;
}): Promise<ResponsePatternType<{ seoKeywordId: number }>> => {
  const auth = await requireSeoManager();
  if (!auth.ok) return deny(auth);
  const keyword = normalizeSearchTerm(params.keyword ?? "");
  if (keyword.length < 2 || keyword.length > 100) return ResponsePattern.badRequest("[SEO-KW-16] คำค้นต้องยาว 2-100 ตัวอักษร");
  const existing = await prisma.seoKeyword.findUnique({ where: { keyword } });
  if (existing) {
    await prisma.seoKeyword.update({ where: { seoKeywordId: existing.seoKeywordId }, data: { status: SeoKeywordStatus.TRACKING } });
    return ResponsePattern.ok("มีคำนี้อยู่แล้ว — เปลี่ยนเป็นติดตามอันดับให้แล้ว", { seoKeywordId: existing.seoKeywordId });
  }
  const created = await prisma.seoKeyword.create({
    data: {
      keyword,
      intent: params.articleType === SeoKeywordArticleType.COMPARE ? "comparison" : "informational",
      articleType: params.articleType === SeoKeywordArticleType.COMPARE ? SeoKeywordArticleType.COMPARE : SeoKeywordArticleType.GUIDE,
      status: SeoKeywordStatus.TRACKING,
      priority: 3,
      rationale: "เพิ่มเองจากหลังบ้าน",
      createdBy: auth.name,
    },
    select: { seoKeywordId: true },
  });
  return ResponsePattern.ok("เพิ่มคำค้นและเริ่มติดตามอันดับแล้ว", created);
};

/**
 * @description ดึงอันดับจาก Search Console ทันที (ไม่ต้องรอ cron 09:30 น.)
 * @access seo.manage
 */
export const syncKeywordRanksNow = async (): Promise<ResponsePatternType<SyncKeywordRanksResult>> => {
  const auth = await requireSeoManager();
  if (!auth.ok) return deny(auth);
  if (!isGscConfigured()) {
    return ResponsePattern.badRequest(
      "[SEO-KW-17] ยังไม่ได้เชื่อม Search Console — ต้องตั้ง GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY / GSC_SITE_URL ก่อน"
    );
  }
  try {
    const result = await syncKeywordRanks();
    return ResponsePattern.ok(`อัปเดตอันดับ ${result.keywords} คำ (${result.rows} วัน-แถว)`, result);
  } catch (error) {
    console.error("[SEO-KW-18] sync rank failed:", error);
    return ResponsePattern.error("[SEO-KW-18] ดึงอันดับจาก Search Console ไม่สำเร็จ");
  }
};
