import { SeoArticleStatus } from "@prisma/client";
import { Compass, FileClock, FileCheck2, FileX2, Files, LineChart, MessageCircleQuestion } from "lucide-react";
import type { PageSectionItem } from "@/components/shared/page-section-sidebar";

/**
 * @description รายชื่อ section ของหน้า hub บทความ SEO — เป็น single source of truth ของ key
 *              (ไฟล์ nuqs import ไปทำ parseAsStringLiteral ต่อ เพื่อไม่ให้ key หลุดกัน)
 * @page /super-admin/hurry-web/seo-article
 */
export const SEO_ARTICLE_SECTIONS = ["overview", "draft", "published", "rejected", "all", "faq", "metrics"] as const;

/** key ของ section ในหน้า hub บทความ SEO */
export type SeoArticleSectionKey = (typeof SEO_ARTICLE_SECTIONS)[number];

/**
 * @description รายการเมนู in-page sidebar ของหน้า hub บทความ SEO (ภาษาไทย)
 * @page /super-admin/hurry-web/seo-article
 * @related ใช้ใน {@link ../components/seo-article-hub-main.tsx}
 */
export const SEO_ARTICLE_SECTION_ITEMS: PageSectionItem[] = [
  { id: "overview", label: "ภาพรวม", description: "สรุปสถานะ · หัวข้อที่ลูกค้าถาม", icon: Compass },
  { id: "draft", label: "รอรีวิว", description: "ร่างที่ AI เขียนไว้ รอตรวจ", icon: FileClock },
  { id: "published", label: "เผยแพร่แล้ว", description: "ขึ้นหน้า /blog แล้ว", icon: FileCheck2 },
  { id: "rejected", label: "ปัดตก", description: "ร่างที่ไม่เอา (กัน AI เสนอซ้ำ)", icon: FileX2 },
  { id: "all", label: "ทั้งหมด", description: "ทุกสถานะรวมกัน", icon: Files },
  {
    id: "faq",
    label: "หน้า ถาม-ตอบ",
    description: "เพิ่มคำถามใหม่ให้ /ask-and-answer",
    icon: MessageCircleQuestion,
  },
  { id: "metrics", label: "ผลบน Google", description: "อันดับ · impressions · คลิก", icon: LineChart },
];

/**
 * @description แปลง section key → สถานะที่ใช้ยิง query รายการบทความ ("ALL" = ไม่กรองสถานะ)
 * @logic section ที่ไม่ใช่รายการบทความ (overview/metrics) จะไม่เรียกฟังก์ชันนี้
 */
export const SEO_ARTICLE_SECTION_STATUS: Partial<Record<SeoArticleSectionKey, SeoArticleStatus | "ALL">> = {
  draft: SeoArticleStatus.DRAFT,
  published: SeoArticleStatus.PUBLISHED,
  rejected: SeoArticleStatus.REJECTED,
  all: "ALL",
};
