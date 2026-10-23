import type { SeoDemandTier } from "../constant/seo-demand-tier";

/**
 * @description หัวข้อบทความ 1 หัวข้อที่ AI เสนอจากหมวดบริการ — ผู้ใช้ติ๊กเลือกก่อนสั่งเขียนจริง
 * @page /super-admin/hurry-web/seo-article
 * @related
 * - ผู้สร้าง: {@link ../server/suggest-category-topics.helper.ts}
 * - ผู้ใช้: {@link ../components/seo-article-topic-suggestion-list.tsx}
 */
export interface SeoCategoryTopicSuggestion {
  /** หัวข้อบทความที่เสนอ (ภาษาไทย) */
  topic: string;
  /** primary keyword ที่ตั้งใจให้ติดอันดับ — normalize ช่องว่างแล้ว พร้อมใช้เทียบกับ GSC */
  targetKeyword: string;
  /** เหตุผลว่าทำไมหัวข้อนี้คุ้ม อ้างข้อมูลจริงที่ให้ไป (ยอดออเดอร์/เงินโฆษณา/อันดับปัจจุบัน) */
  reason: string;
  /** เงินค่าโฆษณาที่คำนี้เผาไปใน 90 วัน (บาท) — 0 = ไม่เจอในข้อมูล Ads */
  adCostBaht: number;
  /** คลิกจากโฆษณาใน 90 วัน — 0 = ไม่เจอในข้อมูล Ads */
  adClicks: number;
  /** ระดับความต้องการของบริการที่หัวข้อนี้พูดถึง — บอกว่าเป็นของขายดีหรือของที่ยังไม่มีใครถาม */
  demandTier: SeoDemandTier;
  /**
   * ยอดแสดงผลออร์แกนิกของเรา 28 วัน
   * 0 = ไม่พบการแสดงผลออร์แกนิกในข้อมูลที่เก็บ ไม่ใช่ไม่มีคนค้น
   */
  searchImpressions: number;
  /** Ads visibility over 90 days, distinct from organic visibility. */
  adImpressions?: number;
  /** Market estimate from fresh Keyword Planner data; null means unavailable. */
  avgMonthlySearches?: number | null;
  /** อันดับออร์แกนิกเฉลี่ยของคำนี้ — null = เรายังไม่เคยขึ้นผลค้นหาเลย */
  organicPosition: number | null;
}
