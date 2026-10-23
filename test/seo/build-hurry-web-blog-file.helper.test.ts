/**
 * Unit Tests สำหรับ build-hurry-web-blog-file.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - ประกอบไฟล์ทีละ field จาก content ปัจจุบัน — `blocks` + `version` + `updatedAt` ต้องถูกเขียนใหม่เสมอ
 *   (บั๊กเดิม: regenerate รูป spread ไฟล์เก่า → blocks เก่าค้าง เว็บตัดสินด้วย hasBlocks = รูปใหม่ไม่ขึ้น)
 * - `publishedAt` ดึงจากไฟล์เดิมเท่านั้น (Google ใช้จัดอันดับความสด) ไม่มี/รูปแบบเพี้ยน → ใช้วันนี้
 * - `coverImage` ว่าง/มีแต่ช่องว่าง = ไม่ใส่ key (ห้าม string ว่าง og:image จะพัง)
 * - ไฟล์ที่ไม่ผ่าน schema ต้องคืน success:false ไม่ปล่อยให้ push
 * - key `en` ใส่เฉพาะเมื่อมี titleEn + metaDescriptionEn ครบคู่ — เว็บใช้ "มี en ไหม" ตัดสินว่า
 *   /en/blog/<slug> จะเสิร์ฟหรือ 404 (object ว่าง = หน้า EN เปล่าโผล่แทนที่จะ 404)
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/server/build-hurry-web-blog-file.helper.ts}
 * - ผู้เรียก: {@link @/feature/backoffice/seo/seo-article/server/publish-seo-article.action.ts},
 *   {@link @/feature/backoffice/seo/seo-article/server/generate-seo-article-images.action.ts}
 */
import { describe, expect, it } from "vitest";
import { buildHurryWebBlogFile } from "@/feature/backoffice/seo/seo-article/server/build-hurry-web-blog-file.helper";
import { SEO_ARTICLE_BLOCK_VERSION } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";
import type { SeoArticleBlockContent } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

const article = {
  slug: "clean-sofa-bangkok",
  title: "วิธีทำความสะอาดโซฟา",
  metaDescription: "แนะนำวิธีทำความสะอาดโซฟาที่บ้าน",
  keywords: ["ซักโซฟา", "ทำความสะอาดโซฟา"],
};

const content = (over: Partial<SeoArticleBlockContent> = {}): SeoArticleBlockContent => ({
  version: SEO_ARTICLE_BLOCK_VERSION,
  category: "careTips",
  coverImage: "https://cdn.example.com/cover-new.webp",
  coverImageAlt: "โซฟาสะอาด",
  blocks: [
    { id: "b1", type: "heading", level: 2, runs: [{ text: "เริ่มต้น" }] },
    { id: "b2", type: "paragraph", runs: [{ text: "เนื้อหาใหม่" }] },
    { id: "b3", type: "image", url: "https://cdn.example.com/new-1.webp", alt: "รูปใหม่" },
  ],
  faq: [{ question: "ราคาเท่าไหร่", answer: "เริ่มต้น 900 บาท" }],
  ...over,
});

const sections = [{ heading: "เริ่มต้น", html: "<p>เนื้อหาใหม่</p>" }];

describe("buildHurryWebBlogFile", () => {
  it("เขียน blocks/version/updatedAt ใหม่ทุกครั้ง และคง publishedAt เดิมจากไฟล์บน repo", () => {
    const result = buildHurryWebBlogFile({
      article,
      content: content(),
      sections,
      existingPublishedAt: "2026-01-05",
      today: "2026-07-18",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.publishedAt).toBe("2026-01-05");
    expect(result.data.updatedAt).toBe("2026-07-18");
    expect(result.data.version).toBe(SEO_ARTICLE_BLOCK_VERSION);
    // blocks ต้องเป็นชุดใหม่จาก content ไม่ใช่ของค้างจากไฟล์เดิม
    expect(result.data.blocks.map((b) => b.id)).toEqual(["b1", "b2", "b3"]);
    expect(result.data.sections).toEqual(sections);
    expect(result.data.coverImage).toBe("https://cdn.example.com/cover-new.webp");
  });

  it("ไม่มี publishedAt เดิม หรือรูปแบบเพี้ยน → ใช้วันนี้", () => {
    const noneResult = buildHurryWebBlogFile({ article, content: content(), sections, today: "2026-07-18" });
    expect(noneResult.success && noneResult.data.publishedAt).toBe("2026-07-18");

    const brokenResult = buildHurryWebBlogFile({
      article,
      content: content(),
      sections,
      existingPublishedAt: "18/07/2026",
      today: "2026-07-18",
    });
    expect(brokenResult.success && brokenResult.data.publishedAt).toBe("2026-07-18");
  });

  it("coverImage ว่าง/มีแต่ช่องว่าง → ไม่ใส่ key ลงไฟล์", () => {
    const result = buildHurryWebBlogFile({
      article,
      content: content({ coverImage: "   " }),
      sections,
      today: "2026-07-18",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.coverImage).toBeUndefined();
    expect("coverImage" in result.data && result.data.coverImage !== undefined).toBe(false);
  });

  it("coverImage ที่มีช่องว่างหัวท้าย ถูก trim ก่อนเขียนลงไฟล์", () => {
    const result = buildHurryWebBlogFile({
      article,
      content: content({ coverImage: "  https://cdn.example.com/c.webp  " }),
      sections,
      today: "2026-07-18",
    });
    expect(result.success && result.data.coverImage).toBe("https://cdn.example.com/c.webp");
  });

  it("ไม่มี section เลย → ไม่ผ่าน schema (กันไฟล์ที่ทำให้เว็บ 404 เงียบ)", () => {
    const result = buildHurryWebBlogFile({ article, content: content(), sections: [], today: "2026-07-18" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.detail).toContain("sections");
  });

  it("slug ไม่ใช่ kebab-case → ไม่ผ่าน schema", () => {
    const result = buildHurryWebBlogFile({
      article: { ...article, slug: "Clean_Sofa" },
      content: content(),
      sections,
      today: "2026-07-18",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.detail).toContain("slug");
  });

  it("ไม่มี keyword เลย → ไม่ผ่าน schema", () => {
    const result = buildHurryWebBlogFile({
      article: { ...article, keywords: [] },
      content: content(),
      sections,
      today: "2026-07-18",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.detail).toContain("keywords");
  });

  it("link อันตรายใน blocks → ไม่ผ่าน schema ไม่ push ขึ้น repo", () => {
    const result = buildHurryWebBlogFile({
      article,
      content: content({
        blocks: [
          {
            id: "b1",
            type: "paragraph",
            runs: [{ text: "กดที่นี่", link: "javascript:alert(1)" }],
          },
        ],
      }),
      sections,
      today: "2026-07-18",
    });
    expect(result.success).toBe(false);
  });

  describe("บทความสองภาษา (key `en`)", () => {
    const articleEn = {
      ...article,
      titleEn: "How to clean a sofa",
      metaDescriptionEn: "A guide to cleaning your sofa at home",
      keywordsEn: ["sofa cleaning", "clean sofa bangkok"],
    };

    it("มี EN ครบ → ไฟล์มี key en พร้อม title/metaDescription/keywords ภาษาอังกฤษ", () => {
      const result = buildHurryWebBlogFile({ article: articleEn, content: content(), sections, today: "2026-07-18" });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.en).toEqual({
        title: "How to clean a sofa",
        metaDescription: "A guide to cleaning your sofa at home",
        keywords: ["sofa cleaning", "clean sofa bangkok"],
        blocks: undefined,
        faq: undefined,
      });
      // field ไทยต้องไม่ถูกแตะ — เว็บ /blog/<slug> ยังอ่านของเดิม
      expect(result.data.title).toBe(article.title);
      expect(result.data.keywords).toEqual(article.keywords);
    });

    it("ไม่มี EN เลย → ไม่มี key en ในไฟล์ (เว็บให้ /en/blog/<slug> 404 ตามเดิม)", () => {
      const result = buildHurryWebBlogFile({ article, content: content(), sections, today: "2026-07-18" });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.en).toBeUndefined();
      // ต้องหายจาก JSON จริงที่ push ขึ้น repo ด้วย ไม่ใช่แค่ undefined ใน object
      expect(JSON.parse(JSON.stringify(result.data))).not.toHaveProperty("en");
    });

    it("EN มีแค่ title (ไม่มี metaDescription) → ไม่ใส่ key en เลย ห้ามใส่ object ครึ่งใบ", () => {
      const result = buildHurryWebBlogFile({
        article: { ...articleEn, metaDescriptionEn: null },
        content: content(),
        sections,
        today: "2026-07-18",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.en).toBeUndefined();
    });

    it("titleEn/metaDescriptionEn เป็นช่องว่างล้วน → ถือว่าไม่มี EN", () => {
      const result = buildHurryWebBlogFile({
        article: { ...articleEn, titleEn: "   ", metaDescriptionEn: "  " },
        content: content(),
        sections,
        today: "2026-07-18",
      });

      expect(result.success && result.data.en).toBeUndefined();
    });

    it("keywordsEn ว่าง แต่ title+metaDescription EN ครบ → ยังใส่ en ได้ (ไม่ทำให้ทั้งไฟล์ตก)", () => {
      const result = buildHurryWebBlogFile({
        article: { ...articleEn, keywordsEn: [] },
        content: content(),
        sections,
        today: "2026-07-18",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.en?.title).toBe("How to clean a sofa");
      expect(result.data.en?.keywords).toEqual([]);
    });

    it("keywordsEn เป็น null/มีค่าว่างปน → กรองทิ้ง ไม่ตกที่ schema", () => {
      const nullResult = buildHurryWebBlogFile({
        article: { ...articleEn, keywordsEn: null },
        content: content(),
        sections,
        today: "2026-07-18",
      });
      expect(nullResult.success && nullResult.data.en?.keywords).toEqual([]);

      const dirtyResult = buildHurryWebBlogFile({
        article: { ...articleEn, keywordsEn: ["  sofa cleaning  ", "   ", ""] },
        content: content(),
        sections,
        today: "2026-07-18",
      });
      expect(dirtyResult.success && dirtyResult.data.en?.keywords).toEqual(["sofa cleaning"]);
    });

    it("มี contentEn → en.blocks/en.faq เป็นชุด EN ส่วน blocks ระดับบนยังเป็นไทย", () => {
      const enContent = content({
        blocks: [{ id: "e1", type: "paragraph", runs: [{ text: "English body" }] }],
        faq: [{ question: "How much?", answer: "From 900 THB" }],
      });

      const result = buildHurryWebBlogFile({
        article: articleEn,
        content: content(),
        sections,
        contentEn: enContent,
        today: "2026-07-18",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.en?.blocks?.map((b) => b.id)).toEqual(["e1"]);
      expect(result.data.en?.faq).toEqual([{ question: "How much?", answer: "From 900 THB" }]);
      expect(result.data.blocks.map((b) => b.id)).toEqual(["b1", "b2", "b3"]);
    });

    it("มี contentEn แต่ไม่มี meta EN → ไม่มี key en (เนื้อ EN อย่างเดียวเสิร์ฟหน้า EN ไม่ได้)", () => {
      const result = buildHurryWebBlogFile({
        article,
        content: content(),
        sections,
        contentEn: content(),
        today: "2026-07-18",
      });

      expect(result.success && result.data.en).toBeUndefined();
    });

    it("regression: ไฟล์เดิมที่ไม่มี EN ยังประกอบได้ครบทุก field เหมือนก่อนเพิ่มสองภาษา", () => {
      const result = buildHurryWebBlogFile({
        article,
        content: content(),
        sections,
        existingPublishedAt: "2026-01-05",
        today: "2026-07-18",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(JSON.parse(JSON.stringify(result.data))).toEqual({
        slug: "clean-sofa-bangkok",
        title: "วิธีทำความสะอาดโซฟา",
        metaDescription: "แนะนำวิธีทำความสะอาดโซฟาที่บ้าน",
        keywords: ["ซักโซฟา", "ทำความสะอาดโซฟา"],
        publishedAt: "2026-01-05",
        updatedAt: "2026-07-18",
        category: "careTips",
        coverImage: "https://cdn.example.com/cover-new.webp",
        coverImageAlt: "โซฟาสะอาด",
        sections,
        version: SEO_ARTICLE_BLOCK_VERSION,
        blocks: content().blocks,
        faq: content().faq,
      });
    });
  });
});
