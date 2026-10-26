import type { SeoArticleCategory, SeoArticleFaq } from "./seo-article-content.type";

/**
 * เวอร์ชันของโครงเนื้อหาบทความ SEO
 * - 1 = โครงเก่า { sections: [{ heading, html, image? }] } (ไม่มี field version ในไฟล์เก่า → undefined = 1)
 * - 2 = โครง block ปัจจุบัน { blocks: SeoArticleBlock[] } ไม่มี HTML string อยู่ที่ไหนเลย
 */
export const SEO_ARTICLE_BLOCK_VERSION = 2 as const;

/** ชนิดของ block ทั้งหมดที่บทความ SEO รองรับ */
export const SEO_ARTICLE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "numberedList",
  "image",
  "table",
  "quote",
  "divider",
  "callout",
] as const;

export type SeoArticleBlockType = (typeof SEO_ARTICLE_BLOCK_TYPES)[number];

/** ระดับหัวข้อที่ใช้ได้ — h1 สงวนให้ title ของบทความ จึงเริ่มที่ h2 */
export const SEO_ARTICLE_HEADING_LEVELS = [2, 3] as const;
export type SeoArticleHeadingLevel = (typeof SEO_ARTICLE_HEADING_LEVELS)[number];

/** โทนของ callout */
export const SEO_ARTICLE_CALLOUT_VARIANTS = ["tip", "warn", "info"] as const;
export type SeoArticleCalloutVariant = (typeof SEO_ARTICLE_CALLOUT_VARIANTS)[number];

/**
 * หน่วยข้อความย่อยที่สุดในบทความ (rich-text run)
 *
 * - `text` เป็น plain text เสมอ — ห้ามมี HTML tag ปนเด็ดขาด (ตัว render ฝั่งเว็บจะ escape ให้)
 * - flag การจัดรูปแบบเป็น optional ทั้งหมด ถ้าไม่มี = ข้อความธรรมดา (ห้ามใส่ `bold: false` ให้เปลือง)
 * - `link` = URL เต็ม (http/https) หรือ path ภายในเว็บ (ขึ้นต้น `/`)
 */
export interface SeoArticleTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

/** หนึ่งรายการใน bulletList / numberedList */
export interface SeoArticleListItem {
  runs: SeoArticleTextRun[];
}

/** หนึ่งช่องในตาราง */
export interface SeoArticleTableCell {
  runs: SeoArticleTextRun[];
  isHeader?: boolean; // true = <th> (แถวหัวตาราง)
}

/** หนึ่งแถวในตาราง */
export interface SeoArticleTableRow {
  cells: SeoArticleTableCell[];
}

/** field ที่ทุก block ต้องมีเหมือนกัน */
interface SeoArticleBlockBase {
  id: string; // id สุ่มไม่ซ้ำ ใช้เป็น key ตอน drag/reorder และอ้างอิงตอนแก้ทีละ block
}

/** ย่อหน้าปกติ */
export interface SeoArticleParagraphBlock extends SeoArticleBlockBase {
  type: "paragraph";
  runs: SeoArticleTextRun[];
}

/** หัวข้อย่อยในบทความ (h2 = หัวข้อหลัก, h3 = หัวข้อซ้อน) */
export interface SeoArticleHeadingBlock extends SeoArticleBlockBase {
  type: "heading";
  level: SeoArticleHeadingLevel;
  runs: SeoArticleTextRun[];
}

/** รายการหัวข้อย่อยแบบจุด (ul) */
export interface SeoArticleBulletListBlock extends SeoArticleBlockBase {
  type: "bulletList";
  items: SeoArticleListItem[];
}

/** รายการแบบลำดับเลข (ol) */
export interface SeoArticleNumberedListBlock extends SeoArticleBlockBase {
  type: "numberedList";
  items: SeoArticleListItem[];
}

/**
 * รูปในเนื้อบทความ
 * - `width`/`height` เป็น optional เพราะรูปจริงมีหลายขนาด (1536x1024 จาก gpt-image-2.5-sunburst, 500x500 จากรูปเก่า)
 *   ห้ามบังคับ — รูปที่ไม่รู้ขนาดต้อง publish ได้ปกติ
 * - `caption` = คำบรรยายใต้รูปที่ผู้ใช้เห็น ต่างจาก `alt` ที่มีไว้ให้ screen reader / SEO
 */
export interface SeoArticleImageBlock extends SeoArticleBlockBase {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

/** ตารางเปรียบเทียบ — แถวแรกที่ทุก cell มี isHeader = หัวตาราง */
export interface SeoArticleTableBlock extends SeoArticleBlockBase {
  type: "table";
  rows: SeoArticleTableRow[];
}

/** ข้อความยกมา (blockquote) */
export interface SeoArticleQuoteBlock extends SeoArticleBlockBase {
  type: "quote";
  runs: SeoArticleTextRun[];
}

/** เส้นคั่น (hr) — ไม่มีเนื้อหา */
export interface SeoArticleDividerBlock extends SeoArticleBlockBase {
  type: "divider";
}

/** กล่องเน้นข้อความ (เคล็ดลับ / คำเตือน / ข้อมูลเพิ่มเติม) */
export interface SeoArticleCalloutBlock extends SeoArticleBlockBase {
  type: "callout";
  variant: SeoArticleCalloutVariant;
  runs: SeoArticleTextRun[];
}

/** union ของ block ทุกชนิด — discriminate ด้วย field `type` */
export type SeoArticleBlock =
  | SeoArticleParagraphBlock
  | SeoArticleHeadingBlock
  | SeoArticleBulletListBlock
  | SeoArticleNumberedListBlock
  | SeoArticleImageBlock
  | SeoArticleTableBlock
  | SeoArticleQuoteBlock
  | SeoArticleDividerBlock
  | SeoArticleCalloutBlock;

/**
 * โครงเนื้อหาบทความ SEO เวอร์ชัน block (เก็บใน SeoArticle.contentJson)
 *
 * ⚠️ `coverImage` ต้องเป็น `string` เหมือนโครงเก่าเสมอ ห้ามเปลี่ยนเป็น object
 * เพราะ og:image / BlogPosting JSON-LD / การ์ดแชร์ LINE-FB ของ 3 บทความที่ Google index แล้ว
 * อ่าน field นี้เป็น string ตรง ๆ — ถ้าอยากได้ alt ของ cover ให้ใช้ `coverImageAlt` ที่เพิ่มมาข้าง ๆ
 */
export interface SeoArticleBlockContent {
  version: typeof SEO_ARTICLE_BLOCK_VERSION;
  coverImage?: string;
  coverImageAlt?: string;
  category: SeoArticleCategory;
  blocks: SeoArticleBlock[];
  faq: SeoArticleFaq[];
}

/** block ที่เนื้อหาเป็น rich-text run ตรง ๆ (ใช้เขียน type guard / helper ที่วนอ่านข้อความ) */
export type SeoArticleRunBlock =
  | SeoArticleParagraphBlock
  | SeoArticleHeadingBlock
  | SeoArticleQuoteBlock
  | SeoArticleCalloutBlock;
