/**
 * Unit Tests สำหรับ seo-article-block-schema.ts + is-legacy-article-content.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - schema ปฏิเสธ block ที่ type ไม่รู้จัก / ไม่มี id
 * - ห้ามมี `.min(n)` ที่ n > 1 บน array ใด ๆ (Anthropic structured output ไม่รองรับ minItems > 1)
 * - guard แยกโครงเก่า/ใหม่ได้ถูกต้อง
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/constant/seo-article-block-schema.ts}
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/helper/is-legacy-article-content.helper.ts}
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  seoArticleBlockContentSchema,
  seoArticleBlockSchema,
} from "@/feature/backoffice/seo/seo-article/constant/seo-article-block-schema";
import {
  isBlockArticleContent,
  isLegacyArticleContent,
} from "@/feature/backoffice/seo/seo-article/helper/is-legacy-article-content.helper";

describe("seoArticleBlockSchema - Negative Cases", () => {
  it("block ที่ type ไม่รู้จักถูกปฏิเสธ", () => {
    expect(seoArticleBlockSchema.safeParse({ id: "a", type: "video", url: "x" }).success).toBe(false);
  });

  it("block ที่ไม่มี id ถูกปฏิเสธ", () => {
    expect(seoArticleBlockSchema.safeParse({ type: "paragraph", runs: [] }).success).toBe(false);
  });

  it("id เป็น string ว่างถูกปฏิเสธ", () => {
    expect(seoArticleBlockSchema.safeParse({ id: "", type: "divider" }).success).toBe(false);
  });

  it("heading level นอกเหนือ 2/3 ถูกปฏิเสธ", () => {
    expect(seoArticleBlockSchema.safeParse({ id: "a", type: "heading", level: 4, runs: [{ text: "x" }] }).success).toBe(
      false
    );
  });

  it("callout variant นอกเหนือ tip/warn/info ถูกปฏิเสธ", () => {
    expect(seoArticleBlockSchema.safeParse({ id: "a", type: "callout", variant: "danger", runs: [] }).success).toBe(
      false
    );
  });

  it("image ที่ width ติดลบถูกปฏิเสธ แต่ image ที่ไม่มี width ผ่าน", () => {
    expect(
      seoArticleBlockSchema.safeParse({ id: "a", type: "image", url: "/a.webp", alt: "x", width: -1 }).success
    ).toBe(false);
    expect(seoArticleBlockSchema.safeParse({ id: "a", type: "image", url: "/a.webp", alt: "x" }).success).toBe(true);
  });

  it("version ที่ไม่ใช่ 2 ถูกปฏิเสธ", () => {
    expect(
      seoArticleBlockContentSchema.safeParse({ version: 1, category: "careTips", blocks: [], faq: [] }).success
    ).toBe(false);
  });
});

describe("seoArticleBlockContentSchema - ข้อจำกัด Anthropic structured output", () => {
  it("ไม่มี array ไหนที่ตั้ง minItems > 1 (Anthropic ไม่รองรับ)", () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(seoArticleBlockContentSchema, { io: "input" }));
    const minItemsValues = [...jsonSchema.matchAll(/"minItems":(\d+)/g)].map((match) => Number(match[1]));

    expect(minItemsValues.every((value) => value <= 1)).toBe(true);
  });

  it("array เปล่าผ่าน schema ได้ (ไม่บังคับจำนวนขั้นต่ำ)", () => {
    const result = seoArticleBlockContentSchema.safeParse({
      version: 2,
      category: "careTips",
      blocks: [],
      faq: [],
    });

    expect(result.success).toBe(true);
  });
});

describe("isLegacyArticleContent / isBlockArticleContent", () => {
  it("โครงเก่า (มี sections ไม่มี version) = legacy", () => {
    const legacy = { category: "careTips", sections: [], faq: [] };

    expect(isLegacyArticleContent(legacy)).toBe(true);
    expect(isBlockArticleContent(legacy)).toBe(false);
  });

  it("โครงใหม่ (version 2 + blocks) = block content", () => {
    const blockContent = { version: 2, category: "careTips", blocks: [], faq: [] };

    expect(isBlockArticleContent(blockContent)).toBe(true);
    expect(isLegacyArticleContent(blockContent)).toBe(false);
  });

  it("ค่าที่ไม่ใช่ object ไม่ทำให้ crash", () => {
    for (const value of [null, undefined, "text", 42, []]) {
      expect(isLegacyArticleContent(value)).toBe(false);
      expect(isBlockArticleContent(value)).toBe(false);
    }
  });
});
