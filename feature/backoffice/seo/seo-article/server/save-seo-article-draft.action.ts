"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import prisma from "@/lib/seo/prisma";
import { seoArticleBlockContentSchema } from "../constant/seo-article-block-schema";
import type { SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";

export interface SaveSeoArticleDraftParams {
  seoArticleId: number;
  /** ฉบับที่กำลังแก้ทั้งก้อน — เก็บดิบ ๆ ลง draftJson ไม่แตะเนื้อจริง */
  snapshot: SeoArticleEditSnapshot;
}

export interface SaveSeoArticleDraftResult {
  draftSavedAt: Date;
  /**
   * updatedAt ใหม่ของแถว — หน้าแก้ไขต้องเอาไปแทนค่าที่ถืออยู่
   * เพราะการกดบันทึกจริงใช้ updatedAt เป็นตัวชนกัน (CAS) ถ้าไม่อัปตาม autosave ทุกครั้ง
   * การกดบันทึกจะถูกตีกลับว่า "มีคนแก้ก่อน" ทั้งที่คนแก้คือ autosave ของตัวเอง
   */
  updatedAt: Date;
}

/**
 * @description autosave ร่างที่กำลังแก้ลงฐาน — เขียนเฉพาะ draftJson ไม่แตะเนื้อบทความจริง
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @logic
 * - **ห้ามแตะ contentJson เด็ดขาด** — บทความที่เผยแพร่แล้ว การเขียนเนื้อจริง = commit ขึ้น GitHub = deploy เว็บ
 *   ร่างจึงมีช่องของตัวเอง autosave ได้ทุก 2 วินาทีโดยไม่มีผลกับเว็บ
 * - ไม่ตรวจความถูกต้องระดับ "พร้อมเผยแพร่" (ชื่อ/slug/meta ว่างได้) เพราะร่างคืองานที่ยังทำไม่เสร็จ
 *   ตรวจแค่ว่า content เป็นโครงบล็อกที่อ่านออก กัน JSON ขยะเข้าฐานจนเปิดหน้าแก้ไขไม่ได้รอบหน้า
 * - ไม่มี CAS ที่นี่ — ร่างเป็นของคนที่กำลังพิมพ์ ใครเซฟทีหลังชนะ (การชนกันจริงถูกจับตอนกดบันทึก)
 * @param params บทความ + ฉบับที่กำลังแก้
 * @returns เวลาที่เซฟร่าง + updatedAt ใหม่ของแถว
 * @used-by {@link ../tanstack/save-seo-article-draft.mutation.ts}
 * @related {@link ./discard-seo-article-draft.action.ts}, {@link ../helper/read-seo-article-draft.helper.ts}
 */
export const saveSeoArticleDraft = async (
  params: SaveSeoArticleDraftParams
): Promise<ResponsePatternType<SaveSeoArticleDraftResult>> => {
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
    return ResponsePattern.forbidden("[SEO-DRAFT-01] เฉพาะ super-admin เท่านั้น");
  }

  // autosave ยิงถี่มาก — ไม่เปิด log session ที่นี่ ไม่งั้น log ท่วมโดยไม่ได้ข้อมูลอะไรเพิ่ม
  const parsed = seoArticleBlockContentSchema.safeParse(params.snapshot?.content);
  if (!parsed.success) {
    return ResponsePattern.badRequest(
      `[SEO-DRAFT-02] โครงเนื้อหาของร่างอ่านไม่ได้ — ${parsed.error.issues[0]?.message}`
    );
  }

  try {
    const draftSavedAt = new Date();
    const updated = await prisma.seoArticle.update({
      where: { seoArticleId: params.seoArticleId },
      data: {
        draftJson: params.snapshot as unknown as object,
        draftSavedAt,
        draftSavedBy: decoded.name || "unknown",
      },
      select: { updatedAt: true },
    });

    return ResponsePattern.ok("เก็บร่างแล้ว", { draftSavedAt, updatedAt: updated.updatedAt });
  } catch (error) {
    console.error(`[SEO-DRAFT-03] เก็บร่างไม่สำเร็จ SEO:${params.seoArticleId}:`, error);
    return ResponsePattern.error("[SEO-DRAFT-03] เก็บร่างไม่สำเร็จ");
  }
};
