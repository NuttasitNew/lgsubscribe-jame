import { seoArticleBlockContentSchema } from "../constant/seo-article-block-schema";
import type { SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";

/** แถวบทความเท่าที่ helper นี้ต้องใช้ — ไม่ผูกกับ type ของ Prisma เพื่อให้เทสต์ประกอบ input ได้ง่าย */
export interface SeoArticleDraftSource {
  draftJson: unknown;
  draftSavedAt: Date | string | null;
  draftSavedBy?: string | null;
  /** เวลาที่เนื้อบทความจริงถูกเขียนล่าสุด — ใช้ตัดสินว่าร่างเก่ากว่าเนื้อจริงไหม */
  contentUpdatedAt: Date | string;
}

export interface SeoArticleDraftState {
  /** ร่างที่อ่านได้ — null = ไม่มีร่างค้าง หรือร่างในฐานพัง/ผิดสเปก */
  snapshot: SeoArticleEditSnapshot | null;
  savedAt: string | null;
  savedBy: string | null;
  /** true = ร่างนี้ถูกบันทึกไว้ **ก่อน** เนื้อบทความจริงถูกแก้ครั้งล่าสุด → ห้ามเอามาแสดงทับเงียบ ๆ */
  isOutdated: boolean;
}

/**
 * @description อ่านร่างที่ค้างในฐาน (draftJson) ให้เป็น snapshot ที่หน้าแก้ไขใช้ได้ พร้อมบอกว่าล้าสมัยหรือยัง
 * @logic
 * - ร่างที่อ่านไม่ออก/ผิดสเปก คืน snapshot=null **ไม่โยน error** — ร่างเป็นของสำรอง ไม่ใช่ความจริงหลัก
 *   ถ้าพังก็แค่ตกไปใช้เนื้อจริงในฐาน ห้ามทำให้เปิดหน้าแก้ไขไม่ได้
 * - ตรวจเฉพาะ `content` ด้วย schema จริง (ส่วนที่พังแล้วทำ editor ระเบิด) ส่วน meta เป็น string ธรรมดา
 * - `isOutdated`: draftSavedAt < contentUpdatedAt แปลว่ามีคนแก้เนื้อจริงหลังจากร่างนี้ถูกเซฟ
 *   (เช่น AI gen รูปยกชุดจบระหว่างที่ร่างค้างอยู่) — เอาร่างมาแสดงทับจะทำให้กดบันทึกแล้วรูปหาย
 *   จึงต้องให้ผู้ใช้เลือกเองว่าจะใช้ร่างเก่าหรือของจริง
 * @param source แถวบทความ (draftJson + เวลาที่เกี่ยวข้อง)
 * @returns สถานะร่างที่ค้างอยู่
 * @used-by seo-article-editor-page.tsx
 * @related {@link ../server/save-seo-article-draft.action.ts}
 */
export const readSeoArticleDraft = (source: SeoArticleDraftSource): SeoArticleDraftState => {
  const empty: SeoArticleDraftState = { snapshot: null, savedAt: null, savedBy: null, isOutdated: false };

  if (!source.draftJson || typeof source.draftJson !== "object" || !source.draftSavedAt) return empty;

  const raw = source.draftJson as Record<string, unknown>;
  const parsedContent = seoArticleBlockContentSchema.safeParse(raw.content);
  if (!parsedContent.success) return empty;

  const savedAtMs = new Date(source.draftSavedAt).getTime();
  const contentUpdatedAtMs = new Date(source.contentUpdatedAt).getTime();
  if (Number.isNaN(savedAtMs)) return empty;

  const snapshot: SeoArticleEditSnapshot = {
    title: typeof raw.title === "string" ? raw.title : "",
    slug: typeof raw.slug === "string" ? raw.slug : "",
    metaDescription: typeof raw.metaDescription === "string" ? raw.metaDescription : "",
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter((item): item is string => typeof item === "string")
      : [],
    content: parsedContent.data,
    ...(typeof raw.targetKeyword === "string" || raw.targetKeyword === null
      ? { targetKeyword: raw.targetKeyword }
      : {}),
    ...(typeof raw.titleEn === "string" ? { titleEn: raw.titleEn } : {}),
    ...(typeof raw.metaDescriptionEn === "string" ? { metaDescriptionEn: raw.metaDescriptionEn } : {}),
    ...(Array.isArray(raw.keywordsEn)
      ? { keywordsEn: raw.keywordsEn.filter((item): item is string => typeof item === "string") }
      : {}),
  };

  return {
    snapshot,
    savedAt: new Date(savedAtMs).toISOString(),
    savedBy: typeof source.draftSavedBy === "string" ? source.draftSavedBy : null,
    // เท่ากันพอดี = ร่างถูกเซฟในวินาทีเดียวกับที่เนื้อจริงถูกเขียน ให้ถือว่ายังไม่ล้าสมัย (ไม่รบกวนผู้ใช้)
    isOutdated: !Number.isNaN(contentUpdatedAtMs) && savedAtMs < contentUpdatedAtMs,
  };
};
