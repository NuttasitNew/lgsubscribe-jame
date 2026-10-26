/**
 * @description โครงสร้างเนื้อหาบทความ SEO — เก็บใน SeoArticle.contentJson และเป็นโครงเดียวกับไฟล์
 *              content/blog/<slug>.json ที่ push ไป repo hurry-web ตอน publish
 * @related {@link ../server/write-seo-article.helper.ts}, {@link ../server/publish-seo-article.action.ts}
 */
export interface SeoArticleSection {
  heading: string; // หัวข้อย่อย (h2)
  html: string; // เนื้อหา HTML string (p/ul/ol เท่านั้น)
  image?: { url: string; alt: string }; // รูปแทรกใต้ heading (gen ด้วย gpt-image-2.5-sunburst, host บน R2)
}

export interface SeoArticleFaq {
  question: string;
  answer: string; // plain text — ใช้ทั้งแสดงผลและ FAQPage JSON-LD
}

export type SeoArticleCategory = "productGuide" | "buyingGuide" | "careTips" | "services";

export interface SeoArticleContent {
  coverImage?: string; // URL รูปหัวบทความ (gen ด้วย gpt-image-2.5-sunburst, host บน R2 ของ hmp)
  category: SeoArticleCategory; // หมวดบทความบนหน้า /blog
  sections: SeoArticleSection[];
  faq: SeoArticleFaq[];
}

/** หัวข้อที่ AI สกัดจากแชท — เก็บใน SeoArticle.sourceTopics (ไม่มีข้อความแชทดิบ) */
export interface SeoSourceTopic {
  topic: string; // หัวข้อ/คำถามที่ลูกค้าถาม (สรุปแล้ว)
  count: number; // จำนวนแชทที่ถามเรื่องนี้ในวันนั้น
  keywords: string[]; // คำค้น SEO ที่เกี่ยว
  targetKeyword?: string; // primary keyword ที่บทความต้องติด (จาก keyword pool ของ Google Ads ถ้า match)
}

/** ไฟล์ JSON ฉบับเต็มที่ push ไป hurry-web (content/blog/<slug>.json) */
export interface HurryWebBlogFile extends SeoArticleContent {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  publishedAt: string; // "yyyy-MM-dd"
}
