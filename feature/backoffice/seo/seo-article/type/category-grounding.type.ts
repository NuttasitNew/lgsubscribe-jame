import type { ClassifiedServiceDemand } from "../helper/classify-service-demand.helper";

/**
 * @description "แฟ้มข้อมูลจริง" ของหมวดบริการหนึ่ง ที่ประกอบจากฐานข้อมูลแล้วส่งเข้า AI
 *              เพื่อให้บทความอ้างของจริงของ Hurryclean ไม่ใช่ความรู้ทั่วไปที่ AI เดาเอง
 * @page /super-admin/hurry-web/seo-article
 * @related
 * - ผู้สร้าง: {@link ../server/build-category-grounding.helper.ts}
 * - ผู้ใช้: {@link ../server/suggest-category-topics.helper.ts}, {@link ../server/write-seo-article.helper.ts}
 */
export interface SeoCategoryGrounding {
  /** รหัสหมวด เช่น "F" */
  categoryCode: string;
  /** ชื่อหมวด เช่น "เฟอร์นิเจอร์" */
  categoryName: string;
  /** กลุ่มบริการย่อยที่ผู้ใช้เลือก เช่น ["โซฟา", "ผ้าม่าน"]; ไม่มี = ใช้ทั้งหมวดหลัก */
  subcategoryNames?: string[];
  /** รุ่นสินค้าจริงในหมวด (ชื่อเต็ม) — บอก AI ว่ามีรุ่นอะไรให้เช่าบ้างจริง ๆ */
  serviceNames: string[];
  /** ความรู้สินค้าของหมวด (สรุปจากเอกสารอบรม) — ใช้เขียนเนื้อหาให้ถูกต้อง */
  productGuide?: {
    summary: string;
    highlights: string[];
    selectionCriteria: string[];
    installation: string[];
    care: string;
  };
  /** ช่วงราคาป้ายในหมวด — null ทั้งคู่ = หมวดนี้เป็นราคาเหมาล้วน ห้ามให้ AI พูดถึงราคา */
  priceRange: { min: number; max: number } | null;
  /** บริการที่ลูกค้าจ้างจริงบ่อยที่สุดในรอบ 12 เดือน เรียงมาก→น้อย */
  topOrderedServices: { serviceName: string; orderCount: number }[];
  /**
   * บริการ **ทุกรายการ** ในหมวด พร้อมระดับความต้องการและป้ายงานราคาสูง
   *
   * ต่างจาก `topOrderedServices` ที่มีแต่ 15 อันดับแรก — ชุดนี้รวมของที่ยังไม่เคยขายเลย (UNTAPPED)
   * ซึ่งเป็นช่องว่างที่ตั้งใจให้ AI เขียนถึง (บริการแพง ๆ ที่ยังไม่มีใครรู้ว่าเรารับ)
   */
  serviceDemand: ClassifiedServiceDemand[];
  /** Keyword Planner estimates scoped to this category, refreshed within 60 days. Ads competition is not SEO difficulty. */
  plannerIdeas?: { keyword: string; avgMonthlySearches: number; competition: string; syncedAt: string }[];
  /** Our observed search visibility, with Ads and organic windows kept separate. */
  searchDemand: {
    keyword: string;
    /** ยอดแสดงผลออร์แกนิกของเรา 28 วัน ไม่ใช่ยอดค้นหาตลาด */
    impressions: number;
    /** Our Ads impressions over 90 days, never added to organic counts. */
    adImpressions?: number;
    /** อันดับออร์แกนิกเฉลี่ยของเรา — null = ไม่เคยขึ้นผลค้นหาเลย (โอกาสว่างเต็ม ๆ) */
    organicPosition: number | null;
    /** มีบทความของเราจับคำนี้เป็น targetKeyword แล้วหรือยัง */
    hasArticle: boolean;
  }[];
  /** คำค้นจริงจาก Google Ads 90 วัน ที่ยังไม่มีบทความไหนจับเป็น targetKeyword */
  adKeywords: { keyword: string; clicks: number; costBaht: number }[];
  /** คำที่เว็บติดอันดับ 8-30 บน Google อยู่แล้ว — ดันอีกนิดขึ้นหน้าแรกได้ (โอกาสคุ้มที่สุด) */
  nearMissQueries: { query: string; impressions: number; position: number }[];
  /** เขตที่ไปทำงานจริงบ่อยในหมวดนี้ — ใช้ยกตัวอย่างพื้นที่ (ขอบเขตบริการจริง = กรุงเทพฯ + ปริมณฑล) */
  topDistricts: string[];
  /** ชื่อบทความที่มีอยู่แล้วทุกสถานะ — กัน AI เสนอหัวข้อซ้ำจนแย่งอันดับกันเอง */
  existingTitles: string[];
  /** Normalized targets of all undeleted articles, including those outside the demand shortlist. */
  existingKeywords?: string[];
}
