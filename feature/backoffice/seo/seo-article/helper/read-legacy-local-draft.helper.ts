import { seoArticleBlockContentSchema } from "../constant/seo-article-block-schema";
import type { SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";

/** key เดิมสมัยที่ร่างยังเก็บในเบราว์เซอร์ (ก่อนย้ายไปเก็บที่ SeoArticle.draftJson) */
const LEGACY_DRAFT_KEY_PREFIX = "seo-article-draft-v2:";

export interface LegacyLocalDraft {
  snapshot: SeoArticleEditSnapshot;
  savedAt: string;
}

/**
 * @description อ่าน (แล้วลบ) ร่างเก่าที่ยังค้างใน localStorage ของเครื่องผู้ใช้ — โค้ดย้ายบ้านชั่วคราว
 * @logic
 * - ร่างเคยเก็บที่ `localStorage["seo-article-draft-v2:<id>"]` ตอนย้ายมาเก็บในฐาน คนที่มีงานพิมพ์ค้าง
 *   ไว้ในเครื่องต้องไม่เสียงานฟรี ๆ จึงอ่านขึ้นมาให้ครั้งเดียวแล้วลบ key ทิ้ง
 *   (ร่างที่กู้ขึ้นมาจะต่างจากของจริง → autosave รอบแรกจะดันขึ้นฐานให้เองโดยอัตโนมัติ)
 * - **ลบทิ้งเสมอแม้อ่านไม่ออก** ไม่งั้น key ขยะจะค้างในเครื่องตลอดไป
 * - อ่านไม่ออก/ผิดสเปกคืน null ไม่โยน error — ร่างเป็นของสำรอง ห้ามทำให้เปิดหน้าแก้ไขไม่ได้
 * - ⚠️ ไฟล์นี้ทิ้งได้เมื่อมั่นใจว่าไม่มีเครื่องไหนเหลือร่างเก่าแล้ว (ประมาณ 1 เดือนหลัง 2026-07-24)
 * @param seoArticleId บทความที่กำลังเปิด
 * @returns ร่างเก่าในเครื่อง หรือ null
 * @used-by seo-article-editor-page.tsx
 * @related {@link ./read-seo-article-draft.helper.ts}
 */
export const readLegacyLocalDraft = (seoArticleId: number): LegacyLocalDraft | null => {
  if (typeof window === "undefined") return null;

  const key = `${LEGACY_DRAFT_KEY_PREFIX}${seoArticleId}`;
  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(key);
    if (raw) window.localStorage.removeItem(key);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { savedAt?: unknown; snapshot?: Record<string, unknown> };
    if (typeof parsed?.savedAt !== "string" || !parsed.snapshot) return null;

    const content = seoArticleBlockContentSchema.safeParse(parsed.snapshot.content);
    if (!content.success) return null;

    const source = parsed.snapshot;
    return {
      savedAt: parsed.savedAt,
      snapshot: {
        title: typeof source.title === "string" ? source.title : "",
        slug: typeof source.slug === "string" ? source.slug : "",
        metaDescription: typeof source.metaDescription === "string" ? source.metaDescription : "",
        keywords: Array.isArray(source.keywords)
          ? source.keywords.filter((item): item is string => typeof item === "string")
          : [],
        content: content.data,
        ...(typeof source.titleEn === "string" ? { titleEn: source.titleEn } : {}),
        ...(typeof source.metaDescriptionEn === "string" ? { metaDescriptionEn: source.metaDescriptionEn } : {}),
        ...(Array.isArray(source.keywordsEn)
          ? { keywordsEn: source.keywordsEn.filter((item): item is string => typeof item === "string") }
          : {}),
      },
    };
  } catch {
    return null;
  }
};
