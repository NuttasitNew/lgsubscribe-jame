// @vitest-environment jsdom
/**
 * @description Smoke test ของ schema โปรแกรมแก้ไขบทความ SEO (BlockNote)
 * @logic
 * - ยืนยันว่า schema สร้างได้จริงตอน runtime (จับการเรียก API ของ BlockNote ผิดรูป ซึ่ง tsc จับไม่ได้ทั้งหมด)
 * - ยืนยันว่าลงทะเบียน block **ครบ 9 ชนิดตามสเปก v2 และไม่มีชนิดเกิน**
 *   ถ้ามีชนิดเกินหลุดเข้ามา ผู้ใช้จะพิมพ์แล้วเนื้อหาหายเงียบตอนบันทึก (converter จะข้ามทิ้ง)
 * @related {@link feature/super-admin/hurry-web/seo-article/components/seo-article-editor-schema.ts}
 */
import { describe, it, expect } from "vitest";
import { seoArticleEditorSchema } from "@/feature/backoffice/seo/seo-article/components/seo-article-editor-schema";
import { convertEditorToSeoBlocks } from "@/lib/seo/helper/convert-editor-to-seo-blocks";

/** ชนิด block ที่ editor ต้องมี — map 1:1 กับสเปก v2 (list ของสเปก 1 ก้อน = block ต่อบรรทัดใน editor) */
const EXPECTED_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "quote",
  "divider",
  "table",
  "seoImage",
  "callout",
];

describe("seoArticleEditorSchema", () => {
  it("สร้าง schema ได้และมี block ครบตามสเปก ไม่มีเกิน", () => {
    expect(Object.keys(seoArticleEditorSchema.blockSchema).sort()).toEqual([...EXPECTED_BLOCK_TYPES].sort());
  });

  it("ไม่มี block ของ BlockNote ที่บทความเก็บไม่ได้หลุดเข้ามา", () => {
    const forbidden = ["audio", "video", "file", "image", "codeBlock", "checkListItem", "toggleListItem", "pageBreak"];
    const registered = Object.keys(seoArticleEditorSchema.blockSchema);

    expect(forbidden.filter((type) => registered.includes(type))).toEqual([]);
  });

  it("หัวข้อจำกัดแค่ระดับ 2-3 (h1 สงวนให้ชื่อบทความ)", () => {
    const levels = seoArticleEditorSchema.blockSchema.heading.propSchema.level.values;
    expect(levels).toEqual([2, 3]);
  });

  it("block รูปมี props ครบตามสเปก (url/alt/caption/width/height) + คำใบ้ชั่วคราว aiStyle", () => {
    expect(Object.keys(seoArticleEditorSchema.blockSchema.seoImage.propSchema).sort()).toEqual(
      ["aiStyle", "alt", "caption", "height", "url", "width"].sort()
    );
  });

  // aiStyle เป็นคำใบ้จากเมนู "/" ว่าให้เปิดช่องสั่งวาดแบบอินโฟกราฟิกแล้ววาดทันที — **ไม่ใช่เนื้อหาบทความ**
  // ตัวแปลงต้องทิ้งค่านี้เสมอ ถ้าวันไหนมันหลุดเข้า block ที่บันทึก แปลว่ามีคนไปเพิ่มให้ converter อ่าน props ตรง ๆ
  it("aiStyle ไม่หลุดเข้าบล็อกที่บันทึก (เป็นคำใบ้ของ editor เท่านั้น)", () => {
    const converted = convertEditorToSeoBlocks([
      {
        id: "img-1",
        type: "seoImage",
        props: {
          url: "https://example.com/a.webp",
          alt: "รูป",
          caption: "",
          width: 10,
          height: 10,
          aiStyle: "infographic",
        },
      },
    ] as never);

    expect(converted).toHaveLength(1);
    expect(converted[0]).not.toHaveProperty("aiStyle");
  });

  it("callout มี 3 โทนตามสเปก", () => {
    expect(seoArticleEditorSchema.blockSchema.callout.propSchema.variant.values).toEqual(["tip", "warn", "info"]);
  });
});
