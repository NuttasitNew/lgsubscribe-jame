/**
 * @description Unit test สำหรับ validateSeoArticleEdit — ด่านตรวจก่อนบันทึกบทความ SEO
 * @logic
 * - ครอบทุก error code ที่ประกาศไว้ + เคสผ่านสะอาด + เคสผิดหลายข้อพร้อมกัน
 * @related {@link helper/validate-seo-article-edit.ts}
 */
import { describe, it, expect } from "vitest";
import { validateSeoArticleEdit } from "@/lib/seo/helper/validate-seo-article-edit";
import type { SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";

const buildSnapshot = (override: Partial<SeoArticleEditSnapshot> = {}): SeoArticleEditSnapshot => ({
  title: "วิธีซักที่นอน",
  slug: "mattress-cleaning-guide",
  metaDescription: "รวมวิธีซักที่นอนให้สะอาด",
  keywords: ["ซักที่นอน"],
  content: {
    version: 2,
    category: "careTips",
    blocks: [{ id: "b1", type: "paragraph", runs: [{ text: "เนื้อหา" }] }],
    faq: [],
    ...(override.content ?? {}),
  },
  ...override,
});

/** ดึงเฉพาะ code ออกมาเทียบ อ่านง่ายกว่าเทียบทั้ง object */
const codesOf = (snapshot: SeoArticleEditSnapshot, lockedSlug?: string) =>
  validateSeoArticleEdit(snapshot, lockedSlug ? { lockedSlug } : {}).map((issue) => issue.code);

describe("validateSeoArticleEdit", () => {
  it("บทความครบถ้วน → ไม่มีปัญหา", () => {
    expect(validateSeoArticleEdit(buildSnapshot())).toEqual([]);
  });

  it("[SEO-EDT-30] ไม่มีชื่อบทความ", () => {
    expect(codesOf(buildSnapshot({ title: "   " }))).toContain("SEO-EDT-30");
  });

  it("[SEO-EDT-31] slug ไม่ใช่ kebab-case", () => {
    expect(codesOf(buildSnapshot({ slug: "Mattress_Cleaning" }))).toContain("SEO-EDT-31");
    expect(codesOf(buildSnapshot({ slug: "ซักที่นอน" }))).toContain("SEO-EDT-31");
    expect(codesOf(buildSnapshot({ slug: "" }))).toContain("SEO-EDT-31");
  });

  it("[SEO-EDT-20] บทความที่เผยแพร่แล้วเปลี่ยน slug ไม่ได้", () => {
    const codes = codesOf(buildSnapshot({ slug: "new-slug" }), "mattress-cleaning-guide");
    expect(codes).toContain("SEO-EDT-20");
  });

  it("slug เดิมของบทความที่เผยแพร่แล้ว → ผ่าน", () => {
    expect(codesOf(buildSnapshot(), "mattress-cleaning-guide")).toEqual([]);
  });

  it("[SEO-EDT-32] ไม่มี meta description", () => {
    expect(codesOf(buildSnapshot({ metaDescription: " " }))).toContain("SEO-EDT-32");
  });

  it("[SEO-EDT-33] ไม่มีคำค้นเลย", () => {
    expect(codesOf(buildSnapshot({ keywords: [] }))).toContain("SEO-EDT-33");
    expect(codesOf(buildSnapshot({ keywords: ["  "] }))).toContain("SEO-EDT-33");
  });

  it("[SEO-EDT-34] ไม่มีเนื้อหาสักบล็อก", () => {
    const snapshot = buildSnapshot();
    snapshot.content.blocks = [];
    expect(codesOf(snapshot)).toContain("SEO-EDT-34");
  });

  it("[SEO-EDT-35] รูปที่ยังไม่กรอก alt (นับจำนวนได้ถูก)", () => {
    const snapshot = buildSnapshot();
    snapshot.content.blocks = [
      { id: "i1", type: "image", url: "https://x/1.webp", alt: "" },
      { id: "i2", type: "image", url: "https://x/2.webp", alt: "  " },
      { id: "i3", type: "image", url: "https://x/3.webp", alt: "มี alt" },
    ];
    const issues = validateSeoArticleEdit(snapshot);
    const issue = issues.find((item) => item.code === "SEO-EDT-35");

    expect(issue?.message).toContain("2 รูป");
  });

  it("[SEO-EDT-36] FAQ ที่กรอกไม่ครบ", () => {
    const snapshot = buildSnapshot();
    snapshot.content.faq = [
      { question: "ถามครบ", answer: "ตอบครบ" },
      { question: "ถามอย่างเดียว", answer: "" },
    ];
    expect(codesOf(snapshot)).toContain("SEO-EDT-36");
  });

  it("FAQ ที่กรอกครบทุกข้อ → ผ่าน", () => {
    const snapshot = buildSnapshot();
    snapshot.content.faq = [{ question: "ถาม", answer: "ตอบ" }];
    expect(validateSeoArticleEdit(snapshot)).toEqual([]);
  });

  it("ผิดหลายข้อพร้อมกัน → คืนครบทุกข้อ", () => {
    const snapshot = buildSnapshot({ title: "", slug: "BAD", metaDescription: "", keywords: [] });
    snapshot.content.blocks = [];
    expect(codesOf(snapshot).sort()).toEqual(
      ["SEO-EDT-30", "SEO-EDT-31", "SEO-EDT-32", "SEO-EDT-33", "SEO-EDT-34"].sort()
    );
  });
});
