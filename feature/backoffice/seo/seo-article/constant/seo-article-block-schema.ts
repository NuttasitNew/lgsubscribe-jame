import { z } from "zod";
import { isSafeArticleHref } from "../helper/to-safe-article-href.helper";
import {
  SEO_ARTICLE_BLOCK_VERSION,
  SEO_ARTICLE_CALLOUT_VARIANTS,
  SEO_ARTICLE_HEADING_LEVELS,
} from "../type/seo-article-block.type";

/**
 * @description zod schema ของโครงบทความ SEO แบบ block — คู่ 1:1 กับ type ใน seo-article-block.type.ts
 * @logic
 * - ใช้ validate 2 ทาง: (1) ผลลัพธ์ที่ AI generate มา (2) contentJson ที่อ่านจาก DB / ที่ editor ส่งมาบันทึก
 * - ⚠️ ข้อจำกัด Anthropic structured output: `minItems` > 1 ไม่รองรับ
 *   → ในไฟล์นี้ห้ามใช้ `.min(n)` ที่ n > 1 บน array เด็ดขาด ให้คุมจำนวนผ่าน `.describe()` แทน
 *   (`.min(1)` ใช้ได้ เพราะ minItems = 1)
 * @related
 * - type: {@link ../type/seo-article-block.type.ts}
 * - ใช้โดย: {@link ../helper/convert-legacy-article.helper.ts}
 */
export const seoArticleTextRunSchema = z.object({
  text: z.string().describe("ข้อความ plain text ห้ามมี HTML tag"),
  bold: z.boolean().optional().describe("ตัวหนา ใส่เฉพาะตอนเป็น true"),
  italic: z.boolean().optional().describe("ตัวเอียง ใส่เฉพาะตอนเป็น true"),
  // ⚠️ กรอง scheme ตั้งแต่ต้นทาง — `javascript:` / `data:` ห้ามเข้า contentJson เด็ดขาด
  // (renderer ฝั่งเว็บใส่ค่านี้ลง href ตรง ๆ ห้ามพึ่ง safeguard ของ React เป็นด่านเดียว)
  link: z
    .string()
    .optional()
    .refine(isSafeArticleHref, { message: "ลิงก์ต้องขึ้นต้นด้วย http://, https:// หรือ / เท่านั้น" })
    .describe("URL ปลายทาง ถ้า run นี้เป็นลิงก์ — ต้องเป็น http/https หรือ path ภายในที่ขึ้นต้น /"),
});

/** รายการใน list — 1 item = 1 บรรทัด */
export const seoArticleListItemSchema = z.object({
  runs: z.array(seoArticleTextRunSchema),
});

/** ช่องในตาราง */
export const seoArticleTableCellSchema = z.object({
  runs: z.array(seoArticleTextRunSchema),
  isHeader: z.boolean().optional().describe("true = ช่องหัวตาราง (th)"),
});

/** แถวในตาราง */
export const seoArticleTableRowSchema = z.object({
  cells: z.array(seoArticleTableCellSchema),
});

/** id ของ block — สร้างด้วย create-block-id.helper.ts */
const blockIdSchema = z.string().min(1).describe("id ไม่ซ้ำของ block ใช้ตอน drag/reorder");

export const seoArticleParagraphBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("paragraph"),
  runs: z.array(seoArticleTextRunSchema),
});

export const seoArticleHeadingBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("heading"),
  level: z
    .union([z.literal(SEO_ARTICLE_HEADING_LEVELS[0]), z.literal(SEO_ARTICLE_HEADING_LEVELS[1])])
    .describe("2 = หัวข้อหลัก, 3 = หัวข้อซ้อน (h1 สงวนให้ title)"),
  runs: z.array(seoArticleTextRunSchema),
});

export const seoArticleBulletListBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("bulletList"),
  items: z.array(seoArticleListItemSchema).describe("แนะนำ 2-6 รายการ"),
});

export const seoArticleNumberedListBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("numberedList"),
  items: z.array(seoArticleListItemSchema).describe("แนะนำ 2-8 รายการ เรียงตามลำดับขั้นตอน"),
});

export const seoArticleImageBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("image"),
  url: z.string().describe("URL รูปเต็ม (host ต้องอยู่ใน remotePatterns ของ hurry-web)"),
  alt: z.string().describe("คำอธิบายรูปสำหรับ screen reader และ SEO"),
  caption: z.string().optional().describe("คำบรรยายใต้รูปที่ผู้อ่านเห็น"),
  width: z.number().int().positive().optional().describe("ความกว้างจริงของรูป (px) ถ้ารู้"),
  height: z.number().int().positive().optional().describe("ความสูงจริงของรูป (px) ถ้ารู้"),
});

export const seoArticleTableBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("table"),
  rows: z.array(seoArticleTableRowSchema).describe("แถวแรกควรเป็นหัวตาราง (isHeader = true)"),
});

export const seoArticleQuoteBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("quote"),
  runs: z.array(seoArticleTextRunSchema),
});

export const seoArticleDividerBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("divider"),
});

export const seoArticleCalloutBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("callout"),
  variant: z.enum(SEO_ARTICLE_CALLOUT_VARIANTS).describe("tip = เคล็ดลับ, warn = คำเตือน, info = ข้อมูลเพิ่มเติม"),
  runs: z.array(seoArticleTextRunSchema),
});

/** union ของ block ทุกชนิด แยกด้วย field `type` */
export const seoArticleBlockSchema = z.discriminatedUnion("type", [
  seoArticleParagraphBlockSchema,
  seoArticleHeadingBlockSchema,
  seoArticleBulletListBlockSchema,
  seoArticleNumberedListBlockSchema,
  seoArticleImageBlockSchema,
  seoArticleTableBlockSchema,
  seoArticleQuoteBlockSchema,
  seoArticleDividerBlockSchema,
  seoArticleCalloutBlockSchema,
]);

/** คำถาม-คำตอบท้ายบทความ (answer เป็น plain text เพราะถูกยัดลง FAQPage JSON-LD ตรง ๆ) */
export const seoArticleFaqSchema = z.object({
  question: z.string(),
  answer: z.string().describe("plain text ห้ามมี HTML tag เพราะใช้ทั้งแสดงผลและ FAQPage JSON-LD"),
});

export const seoArticleCategorySchema = z.enum(["productGuide", "buyingGuide", "careTips", "services"]);

/**
 * schema ของ contentJson ทั้งก้อน (โครง block เวอร์ชัน 2)
 * ⚠️ coverImage คง `string` เหมือนโครงเก่า ห้ามเปลี่ยนเป็น object — og:image / JSON-LD ของบทความที่ publish แล้วอ่านตรง ๆ
 */
export const seoArticleBlockContentSchema = z.object({
  version: z.literal(SEO_ARTICLE_BLOCK_VERSION),
  coverImage: z.string().optional(),
  coverImageAlt: z.string().optional(),
  category: seoArticleCategorySchema,
  blocks: z.array(seoArticleBlockSchema),
  faq: z.array(seoArticleFaqSchema),
});

export type SeoArticleBlockContentInput = z.infer<typeof seoArticleBlockContentSchema>;
