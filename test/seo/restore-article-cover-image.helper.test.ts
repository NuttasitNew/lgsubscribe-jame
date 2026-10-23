/**
 * Unit Tests สำหรับ restore-article-cover-image.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - gen ปกพัง (ผลลัพธ์ไม่มี coverImage) แต่มีปกเดิม → คืนปกเดิม + alt เดิม
 *   (บั๊กเดิม: ปกของบทความที่ Google index แล้วหายถาวร → og:image หาย, JSON-LD image ตกไปโลโก้, การ์ดแชร์พัง)
 * - รูปแทรกที่ gen สำเร็จรอบเดียวกันต้องไม่ถูกย้อนกลับไปด้วย
 * - gen ปกสำเร็จ → ใช้ปกใหม่ ห้ามคืนของเก่า
 * - ไม่มีปกเดิมให้คืน → ยังรายงาน coverFailed ให้ผู้เรียก log ได้
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/helper/restore-article-cover-image.helper.ts}
 * - ผู้เรียก: {@link @/feature/backoffice/seo/seo-article/server/generate-seo-article-images.action.ts}
 */
import { describe, expect, it } from "vitest";
import { restoreArticleCoverImage } from "@/feature/backoffice/seo/seo-article/helper/restore-article-cover-image.helper";
import {
  SEO_ARTICLE_BLOCK_VERSION,
  type SeoArticleBlockContent,
} from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

const generatedContent = (coverImage?: string): SeoArticleBlockContent => ({
  version: SEO_ARTICLE_BLOCK_VERSION,
  category: "careTips",
  ...(coverImage ? { coverImage, coverImageAlt: "ปกใหม่" } : {}),
  blocks: [
    { id: "b1", type: "heading", level: 2, runs: [{ text: "หัวข้อ" }] },
    { id: "img-new", type: "image", url: "https://cdn.example.com/section-new.webp", alt: "รูปแทรกใหม่" },
  ],
  faq: [],
});

describe("restoreArticleCoverImage", () => {
  it("gen ปกพังแต่มีปกเดิม → คืนปกเดิมพร้อม alt เดิม และคง block รูปแทรกใหม่ไว้", () => {
    const result = restoreArticleCoverImage(generatedContent(), "https://cdn.example.com/cover-old.webp", "ปกเดิม");

    expect(result.coverFailed).toBe(true);
    expect(result.coverRestored).toBe(true);
    expect(result.content.coverImage).toBe("https://cdn.example.com/cover-old.webp");
    expect(result.content.coverImageAlt).toBe("ปกเดิม");
    // รูปแทรกที่ gen สำเร็จรอบเดียวกันต้องไม่หาย
    expect(result.content.blocks.some((b) => b.type === "image" && b.url.includes("section-new"))).toBe(true);
  });

  it("gen ปกสำเร็จ → ใช้ปกใหม่ ห้ามคืนของเก่า", () => {
    const result = restoreArticleCoverImage(
      generatedContent("https://cdn.example.com/cover-new.webp"),
      "https://cdn.example.com/cover-old.webp",
      "ปกเดิม"
    );

    expect(result.coverFailed).toBe(false);
    expect(result.coverRestored).toBe(false);
    expect(result.content.coverImage).toBe("https://cdn.example.com/cover-new.webp");
    expect(result.content.coverImageAlt).toBe("ปกใหม่");
  });

  it("gen ปกพัง และไม่มีปกเดิม → ไม่คืนอะไร แต่ยังรายงาน coverFailed", () => {
    const result = restoreArticleCoverImage(generatedContent(), undefined, undefined);

    expect(result.coverFailed).toBe(true);
    expect(result.coverRestored).toBe(false);
    expect(result.content.coverImage).toBeUndefined();
  });

  it("ปกเดิมเป็นช่องว่างล้วน = ถือว่าไม่มีปกเดิม", () => {
    const result = restoreArticleCoverImage(generatedContent(), "   ", "ปกเดิม");

    expect(result.coverFailed).toBe(true);
    expect(result.coverRestored).toBe(false);
    expect(result.content.coverImage).toBeUndefined();
  });

  it("ปกใหม่ที่ได้เป็นสตริงว่าง/ช่องว่าง = ถือว่า gen ปกพัง ต้องคืนปกเดิม", () => {
    const result = restoreArticleCoverImage(
      { ...generatedContent(), coverImage: "   " },
      "https://cdn.example.com/cover-old.webp",
      "ปกเดิม"
    );

    expect(result.coverFailed).toBe(true);
    expect(result.content.coverImage).toBe("https://cdn.example.com/cover-old.webp");
  });

  it("ไม่ mutate ก้อน content ที่รับเข้ามา", () => {
    const input = generatedContent();
    restoreArticleCoverImage(input, "https://cdn.example.com/cover-old.webp", "ปกเดิม");
    expect(input.coverImage).toBeUndefined();
  });
});
