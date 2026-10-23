"use client";

import {
  BlockNoteSchema,
  createBulletListItemBlockSpec,
  createDividerBlockSpec,
  createHeadingBlockSpec,
  createNumberedListItemBlockSpec,
  createParagraphBlockSpec,
  createQuoteBlockSpec,
  createTableBlockSpec,
} from "@blocknote/core";
import { seoArticleCalloutBlock } from "./seo-article-callout-block";
import { seoArticleImageBlock } from "./seo-article-image-block";

/**
 * @description Schema ของโปรแกรมแก้ไขบทความ SEO — จำกัดชนิด block ให้ตรงกับสเปก v2 เป๊ะ ๆ
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @logic
 * - ลงทะเบียนเฉพาะ 9 ชนิดที่สเปก v2 เก็บได้ (ย่อหน้า/หัวข้อ/2 รายการ/รูป/ตาราง/quote/เส้นคั่น/callout)
 *   **ไม่เอา block มาตรฐานที่เหลือของ BlockNote** (ไฟล์/เสียง/วิดีโอ/โค้ด/checklist/toggle)
 *   เพราะบทความเก็บชนิดพวกนั้นไม่ได้ → ถ้าเปิดไว้ ผู้ใช้จะพิมพ์แล้วเนื้อหาหายเงียบตอนบันทึก
 * - หัวข้อจำกัดแค่ระดับ 2-3: h1 สงวนให้ชื่อบทความ (เว็บ render title เป็น h1 อยู่แล้ว)
 *   ผลพลอยได้คือพิมพ์ `## ` ได้ h2 และ `### ` ได้ h3 ตรงตามที่เก็บจริง
 * - รูปใช้ block กำหนดเอง `seoImage` แทน image ของ BlockNote เพราะต้องอัปผ่าน Vercel Blob เองและบังคับกรอก alt
 * @related
 * - block รูป: {@link seo-article-image-block.tsx}
 * - block callout: {@link seo-article-callout-block.tsx}
 * - สเปกโครงบล็อก: {@link ../type/seo-article-block.type.ts}
 */
export const seoArticleEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: createParagraphBlockSpec(),
    heading: createHeadingBlockSpec({ levels: [2, 3], defaultLevel: 2 }),
    bulletListItem: createBulletListItemBlockSpec(),
    numberedListItem: createNumberedListItemBlockSpec(),
    quote: createQuoteBlockSpec(),
    divider: createDividerBlockSpec(),
    table: createTableBlockSpec(),
    seoImage: seoArticleImageBlock(),
    callout: seoArticleCalloutBlock(),
  },
});

/** ชนิดของ editor ที่ผูกกับ schema ด้านบน — ใช้ประกาศ props ของ component ลูก */
export type SeoArticleEditor = typeof seoArticleEditorSchema.BlockNoteEditor;
