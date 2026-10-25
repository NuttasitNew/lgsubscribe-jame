import type { SeoKeywordArticleType, SeoKeywordStatus } from "@prisma/client";
import type { SeoKeywordEvidence } from "./seo-keyword.type";

/** 1 แถวในตาราง keyword ของหน้าหลังบ้าน */
export interface SeoKeywordRow {
  seoKeywordId: number;
  keyword: string;
  intent: string;
  persona: string | null;
  articleType: SeoKeywordArticleType;
  priority: number;
  rationale: string | null;
  status: SeoKeywordStatus;
  evidence: SeoKeywordEvidence | null;
  serpAnalyzedAt: string | null;
  /** จำนวนช่องโหว่ / แบรนด์ที่เทียบ จากผล research ล่าสุด */
  researchSummary: string | null;
  article: { seoArticleId: number; title: string; slug: string; status: string } | null;
  /** อันดับล่าสุดที่ Search Console มีข้อมูล (null = ยังไม่ติดผลค้นหา) */
  latestRank: { date: string; position: number; page: string; clicks: number; impressions: number } | null;
  /** อันดับเมื่อ ~7 วันก่อนวันล่าสุด — ใช้คำนวณขึ้น/ลง */
  previousPosition: number | null;
  bestPosition: number | null;
  /** อันดับรายวัน 28 วันล่าสุด (เก่า → ใหม่) สำหรับกราฟเล็ก */
  history: { date: string; position: number }[];
}
