import { z } from "zod";
import { seoArticleBlockContentSchema, seoArticleCategorySchema } from "../constant/seo-article-block-schema";
import { SEO_ARTICLE_BLOCK_VERSION, type SeoArticleBlockContent } from "../type/seo-article-block.type";
import type { SeoArticleSection } from "../type/seo-article-content.type";

/** วันที่รูปแบบ yyyy-MM-dd (เว็บใช้ตรง ๆ ใน BlogPosting JSON-LD) */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ต้องเป็นรูปแบบ yyyy-MM-dd");

/**
 * ฉบับภาษาอังกฤษของบทความ ที่แนบไปกับไฟล์เดียวกันใต้ key `en`
 * ⚠️ `keywords` ที่นี่ **ห้ามใส่ .min(1)** ต่างจาก keywords ไทย — แอดมินกรอกแค่ title/metaDescription EN
 *    แล้วปล่อย keyword ว่างเป็นเคสปกติ ถ้าบังคับ min(1) จะทำให้ทั้งไฟล์ตกและ publish ไม่ออกทั้งบทความ
 *    (ว่าง = เว็บ fallback ไปใช้ keywords ไทย)
 * ⚠️ `blocks`/`faq` optional — เฟสนี้ทุกบทความยังไม่แปลเนื้อ เว็บจึง fallback ไป render blocks ไทยใต้ metadata EN
 */
export const hurryWebBlogFileEnSchema = z.object({
  title: z.string().trim().min(1),
  metaDescription: z.string().trim().min(1),
  keywords: z.array(z.string().trim().min(1)),
  blocks: seoArticleBlockContentSchema.shape.blocks.optional(),
  faq: seoArticleBlockContentSchema.shape.faq.optional(),
});

/**
 * schema ของไฟล์ที่ push ขึ้น repo hurry-web — ด่านสุดท้ายก่อนไฟล์ออกจากระบบ
 * ⚠️ `coverImage` เป็น string ล้วนเท่านั้น ห้ามเป็น object เด็ดขาด (og:image / BlogPosting JSON-LD
 *    / การ์ดแชร์ LINE-FB ของบทความที่ Google index ไปแล้วอ่าน field นี้เป็น string ตรง ๆ)
 * ⚠️ ต้องมี `sections` เป็น array เสมอ — hurry-web กรองบทความด้วยเงื่อนไขนี้ ไม่มี = 404 เงียบ
 * ⚠️ ต้องมี `blocks` + `version` เสมอ — renderer ใหม่ของเว็บตัดสินด้วย hasBlocks ถ้า blocks ค้างของเก่า
 *    เนื้อหาบนเว็บจะเป็นคนละเรื่องกับ sections ถาวร
 */
export const hurryWebBlogFileSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug ต้องเป็น kebab-case (ไม่งั้นเว็บ 404)"),
  title: z.string().trim().min(1),
  metaDescription: z.string().trim().min(1),
  keywords: z.array(z.string().trim().min(1)).min(1),
  publishedAt: isoDateSchema,
  updatedAt: isoDateSchema,
  category: seoArticleCategorySchema,
  coverImage: z.string().trim().min(1).optional(),
  coverImageAlt: z.string().optional(),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        html: z.string(),
        image: z.object({ url: z.string().min(1), alt: z.string() }).optional(),
      })
    )
    .min(1, "บทความต้องมีอย่างน้อย 1 หัวข้อ"),
  version: z.literal(SEO_ARTICLE_BLOCK_VERSION),
  blocks: seoArticleBlockContentSchema.shape.blocks,
  faq: seoArticleBlockContentSchema.shape.faq,
  en: hurryWebBlogFileEnSchema.optional(),
});

/** ไฟล์ content/blog/<slug>.json ฉบับที่ระบบนี้เขียน (sections = ของที่เว็บเก่าอ่าน, blocks = ของที่ renderer ใหม่อ่าน) */
export type HurryWebBlogFileV2 = z.infer<typeof hurryWebBlogFileSchema>;

/**
 * @description วันที่วันนี้ตามเวลาไทยรูปแบบ yyyy-MM-dd
 * @logic ใช้ Intl timeZone Asia/Bangkok — server อยู่ UTC ถ้าใช้ toISOString วันจะเพี้ยนช่วงหลังเที่ยงคืนไทย
 * @returns วันที่ "yyyy-MM-dd"
 * @used-by {@link buildHurryWebBlogFile}
 */
export const thaiToday = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

/** ข้อมูลแถวใน DB เท่าที่ไฟล์บนเว็บต้องใช้ (field EN เป็น nullable ทั้งชุด — บทความไทยล้วนปล่อยว่าง) */
export interface HurryWebBlogFileArticle {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  titleEn?: string | null;
  metaDescriptionEn?: string | null;
  keywordsEn?: string[] | null;
}

export interface BuildHurryWebBlogFileParams {
  article: HurryWebBlogFileArticle;
  content: SeoArticleBlockContent; // โครง block ที่ผ่าน schema แล้ว (แหล่งความจริงของ blocks/faq/coverImage)
  sections: SeoArticleSection[]; // ผลจาก renderBlocksToSections(content.blocks)
  contentEn?: SeoArticleBlockContent | null; // โครง block ฉบับ EN ที่ผ่าน schema แล้ว (เฟสนี้ยัง null ทุกแถว)
  existingPublishedAt?: string; // publishedAt จากไฟล์เดิมบน repo (ถ้ามี)
  today?: string; // inject เพื่อ test — ปกติใช้ thaiToday()
}

/**
 * @description ประกอบ key `en` ของไฟล์บทความ — คืน undefined เมื่อบทความนี้ไม่มีฉบับ EN
 * @logic
 * - ต้องมี **ทั้ง** titleEn และ metaDescriptionEn (trim แล้วไม่ว่าง) ถึงจะถือว่ามีฉบับ EN
 *   ขาดตัวใดตัวหนึ่ง → คืน undefined = ไม่มี key `en` ในไฟล์ (ห้ามคืน object ว่าง:
 *   เว็บใช้ "มี en ไหม" เป็นตัวตัดสินว่า /en/blog/<slug> จะเสิร์ฟหรือ 404 — object ว่างจะทำให้
 *   หน้า EN ขึ้นมาแบบไม่มี title/description แทนที่จะ 404 ตามที่ตั้งใจ)
 * - `keywords` ว่างได้ (ไม่ block การใส่ en) — เว็บ fallback ไปใช้ keywords ไทย
 * - `blocks`/`faq` ใส่เฉพาะเมื่อมี contentEn จริง — ไม่มี = เว็บ fallback ไป render เนื้อไทย
 * @param article แถวบทความ (field EN)
 * @param contentEn โครง block ฉบับ EN ถ้ามี
 * @returns object `en` หรือ undefined
 * @used-by {@link buildHurryWebBlogFile}
 */
const buildEnSection = (
  article: HurryWebBlogFileArticle,
  contentEn?: SeoArticleBlockContent | null
): HurryWebBlogFileV2["en"] => {
  const titleEn = article.titleEn?.trim();
  const metaDescriptionEn = article.metaDescriptionEn?.trim();
  if (!titleEn || !metaDescriptionEn) return undefined;

  const keywordsEn = (article.keywordsEn ?? [])
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

  return {
    title: titleEn,
    metaDescription: metaDescriptionEn,
    keywords: keywordsEn,
    blocks: contentEn?.blocks,
    faq: contentEn?.faq,
  };
};

export type BuildHurryWebBlogFileResult =
  | { success: true; data: HurryWebBlogFileV2 }
  | { success: false; detail: string };

/**
 * @description ประกอบไฟล์ content/blog/<slug>.json ที่จะ push ขึ้น repo hurry-web + ตรวจ schema ก่อนคืน
 * @logic
 * - ประกอบ **ทีละ field** จากแถวใน DB ห้าม spread ของเดิมจากไฟล์บน repo เด็ดขาด
 *   เหตุผล 2 ข้อ: (1) field ที่แอดมินลบไปแล้วจะฟื้นกลับมา
 *   (2) `blocks` เก่าจะติดมากับ spread แล้วไม่ถูกอัปเดต — เว็บตัดสินด้วย hasBlocks จึงแสดงของเก่าชนะ sections ใหม่ถาวร
 * - ดึงจากไฟล์เดิมได้แค่ `publishedAt` (วันเผยแพร่ครั้งแรก ห้ามขยับ — Google ใช้จัดอันดับความสด)
 *   ไม่มี/รูปแบบเพี้ยน → ใช้วันนี้
 * - `updatedAt` เขียนใหม่ทุกครั้ง (เว็บใช้ทำ dateModified ของ BlogPosting)
 * - `coverImage` trim แล้วว่าง = ไม่ใส่ key เลย (ห้ามใส่ string ว่าง og:image จะพัง)
 * - `en` ใส่เฉพาะบทความที่มี titleEn + metaDescriptionEn ครบคู่ (ดู {@link buildEnSection})
 *   มี en = /en/blog/<slug> เสิร์ฟได้ + มี hreflang th/en คู่กัน / ไม่มี en = /en 404 ตามเดิม
 * - ผลลัพธ์ต้องผ่าน hurryWebBlogFileSchema เสมอ ไม่ผ่าน = คืน success:false ผู้เรียกต้องไม่ push
 * @param params แถวบทความ + content โครง block + sections ที่ render แล้ว + contentEn + publishedAt เดิม
 * @returns ไฟล์ที่ตรวจแล้วพร้อม push หรือเหตุผลที่ไม่ผ่าน
 * @used-by {@link publish-seo-article.action.ts}, {@link generate-seo-article-images.action.ts}
 * @related {@link render-blocks-to-sections.helper.ts}
 */
export function buildHurryWebBlogFile(params: BuildHurryWebBlogFileParams): BuildHurryWebBlogFileResult {
  const { article, content, sections, contentEn, existingPublishedAt } = params;
  const today = params.today ?? thaiToday();

  const publishedAt =
    existingPublishedAt && isoDateSchema.safeParse(existingPublishedAt).success ? existingPublishedAt : today;

  const coverImage = content.coverImage?.trim() ? content.coverImage.trim() : undefined;

  const blogFile: HurryWebBlogFileV2 = {
    slug: article.slug,
    title: article.title,
    metaDescription: article.metaDescription,
    keywords: article.keywords,
    publishedAt,
    updatedAt: today,
    category: content.category,
    coverImage, // ⚠️ string เท่านั้น (ว่าง = ไม่ใส่ key)
    coverImageAlt: content.coverImageAlt,
    sections,
    version: SEO_ARTICLE_BLOCK_VERSION,
    blocks: content.blocks,
    faq: content.faq,
    en: buildEnSection(article, contentEn), // undefined = ไม่มีฉบับ EN → /en/blog/<slug> คง 404
  };

  const check = hurryWebBlogFileSchema.safeParse(blogFile);
  if (!check.success) {
    const issue = check.error.issues[0];
    return { success: false, detail: issue ? `${issue.path.join(".")}: ${issue.message}` : "ไม่ทราบสาเหตุ" };
  }

  return { success: true, data: check.data };
}
