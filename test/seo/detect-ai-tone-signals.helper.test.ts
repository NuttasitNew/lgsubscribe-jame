/**
 * Unit Tests สำหรับ detect-ai-tone-signals.helper.ts
 *
 * @logic ที่ต้อง verify:
 * - [SEO-TONE-01] สัดส่วน paragraph < 60% ของบล็อกเนื้อหา → เตือน (heading/divider/image ไม่นับเป็นตัวหาร)
 * - [SEO-TONE-02] สัดส่วน bulletList+numberedList > 35% ของบล็อกเนื้อหา → เตือน
 * - [SEO-TONE-03] มีบล็อกรายการวางติดกัน 2 ชุดโดยไม่มีย่อหน้าคั่น → เตือน
 * - [SEO-TONE-04] ย่อหน้า >= 4 ย่อหน้า และค่าการกระจายความยาว (SD ÷ mean) < 0.18 → เตือน
 * - [SEO-TONE-05] สำนวนลายเซ็น AI เกินโควตาใน AI_TONE_PHRASES → เตือน
 * - เตือนอย่างเดียว ไม่ throw และไม่ปัดตกบทความ
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/server/detect-ai-tone-signals.helper.ts}
 * - ผู้เรียก: {@link @/feature/backoffice/seo/seo-article/server/write-seo-article.helper.ts}
 */
import { describe, it, expect } from "vitest";
import { detectAiToneSignals } from "@/feature/backoffice/seo/seo-article/server/detect-ai-tone-signals.helper";
import type { SeoArticleBlock } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

/** สร้างย่อหน้าความยาวตามที่กำหนด — คุมความยาวเองเพื่อให้ค่าการกระจายเป็น deterministic */
const paragraph = (id: string, length: number, text = "ก"): SeoArticleBlock => ({
  id,
  type: "paragraph",
  runs: [{ text: text.repeat(length) }],
});

/** สร้างย่อหน้าจากข้อความจริง (ใช้ทดสอบการค้นสำนวนต้องห้าม) */
const paragraphText = (id: string, text: string): SeoArticleBlock => ({ id, type: "paragraph", runs: [{ text }] });

const bulletList = (id: string): SeoArticleBlock => ({
  id,
  type: "bulletList",
  items: [{ runs: [{ text: "เตรียมผ้าไมโครไฟเบอร์" }] }, { runs: [{ text: "เตรียมน้ำอุ่น" }] }],
});

const heading = (id: string): SeoArticleBlock => ({ id, type: "heading", level: 2, runs: [{ text: "หัวข้อ" }] });

/** ย่อหน้าความยาวหลากหลาย 6 ย่อหน้า — ผ่านทุกเกณฑ์ ใช้เป็นฐานของเคสที่ควรสะอาด */
const variedParagraphs = (): SeoArticleBlock[] => [
  paragraph("p1", 40),
  paragraph("p2", 180),
  paragraph("p3", 90),
  paragraph("p4", 250),
  paragraph("p5", 60),
  paragraph("p6", 150),
];

describe("detectAiToneSignals", () => {
  describe("Happy Path — บทความที่เขียนเหมือนคน", () => {
    it("ย่อหน้าล้วนความยาวหลากหลาย + heading คั่น → ไม่มี warning", () => {
      const blocks = [heading("h1"), ...variedParagraphs()];
      expect(detectAiToneSignals(blocks)).toEqual([]);
    });

    it("ย่อหน้า 6 + รายการ 1 ชุด (14% ของเนื้อหา) → ไม่มี warning", () => {
      // บล็อกเนื้อหา 7 บล็อก: paragraph 6 (86% ≥ 60%), list 1 (14% ≤ 35%)
      const blocks = [heading("h1"), ...variedParagraphs(), bulletList("l1")];
      expect(detectAiToneSignals(blocks)).toEqual([]);
    });
  });

  describe("[SEO-TONE-01/02] สัดส่วนความเรียง", () => {
    it("รายการ 3 ชุด + ย่อหน้า 3 → เตือนทั้งย่อหน้าน้อยและรายการเยอะ", () => {
      // บล็อกเนื้อหา 6: paragraph 3 (50% < 60%), list 3 (50% > 35%)
      const blocks = [
        paragraph("p1", 40),
        bulletList("l1"),
        paragraph("p2", 180),
        bulletList("l2"),
        paragraph("p3", 90),
        bulletList("l3"),
      ];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-01]"))).toBe(true);
      expect(warnings.some((w) => w.includes("[SEO-TONE-02]"))).toBe(true);
    });

    it("heading ไม่ถูกนับเป็นตัวหาร — ย่อหน้า 6 + heading 5 ยังนับเป็น 100%", () => {
      const blocks = [heading("h1"), heading("h2"), heading("h3"), heading("h4"), heading("h5"), ...variedParagraphs()];
      expect(detectAiToneSignals(blocks)).toEqual([]);
    });
  });

  describe("[SEO-TONE-03] รายการติดกัน", () => {
    it("bulletList ตามด้วย numberedList ทันที → เตือน", () => {
      const blocks: SeoArticleBlock[] = [
        ...variedParagraphs(),
        bulletList("l1"),
        { id: "l2", type: "numberedList", items: [{ runs: [{ text: "ขั้นที่ 1" }] }] },
      ];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-03]"))).toBe(true);
    });

    it("heading คั่นระหว่างรายการไม่นับว่าคั่น — heading ไม่ใช่บล็อกเนื้อหา", () => {
      const blocks = [...variedParagraphs(), bulletList("l1"), heading("h1"), bulletList("l2")];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-03]"))).toBe(true);
    });

    it("มีย่อหน้าคั่นระหว่างรายการ → ไม่เตือนข้อนี้", () => {
      const blocks = [...variedParagraphs(), bulletList("l1"), paragraph("p7", 120), bulletList("l2")];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-03]"))).toBe(false);
    });
  });

  describe("[SEO-TONE-04] ความยาวย่อหน้าสม่ำเสมอเกินไป", () => {
    it("ย่อหน้า 5 ย่อหน้ายาว 100 ตัวอักษรเท่ากันหมด (การกระจาย = 0) → เตือน", () => {
      const blocks = [
        paragraph("p1", 100),
        paragraph("p2", 100),
        paragraph("p3", 100),
        paragraph("p4", 100),
        paragraph("p5", 100),
      ];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-04]"))).toBe(true);
    });

    it("ย่อหน้าแค่ 3 ย่อหน้า (ต่ำกว่าเกณฑ์ขั้นต่ำ 4) → ไม่ตรวจความสม่ำเสมอ", () => {
      const blocks = [paragraph("p1", 100), paragraph("p2", 100), paragraph("p3", 100)];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-04]"))).toBe(false);
    });

    it("ย่อหน้ายาวสั้นสลับกัน → ไม่เตือนข้อนี้", () => {
      const warnings = detectAiToneSignals(variedParagraphs());
      expect(warnings.some((w) => w.includes("[SEO-TONE-04]"))).toBe(false);
    });
  });

  describe("[SEO-TONE-05] สำนวนลายเซ็น AI", () => {
    it('"ไม่เพียงแต่" ใช้ครั้งเดียวก็เตือน (โควตา 0)', () => {
      const blocks = [...variedParagraphs(), paragraphText("p7", "การซักโซฟาไม่เพียงแต่ทำให้สะอาด แต่ยังลดกลิ่นอับ")];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-05]") && w.includes("ไม่เพียงแต่"))).toBe(true);
    });

    it('"อย่างไรก็ตาม" 2 ครั้งยังผ่าน (โควตา 2)', () => {
      const blocks = [
        ...variedParagraphs(),
        paragraphText("p7", "อย่างไรก็ตาม คราบเก่าต้องใช้เวลา"),
        paragraphText("p8", "อย่างไรก็ตาม ผ้ากำมะหยี่ห้ามขัดแรง"),
      ];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("อย่างไรก็ตาม"))).toBe(false);
    });

    it('"อย่างไรก็ตาม" 3 ครั้ง → เตือน', () => {
      const blocks = [
        ...variedParagraphs(),
        paragraphText("p7", "อย่างไรก็ตาม คราบเก่าต้องใช้เวลา"),
        paragraphText("p8", "อย่างไรก็ตาม ผ้ากำมะหยี่ห้ามขัดแรง"),
        paragraphText("p9", "อย่างไรก็ตาม หนังแท้ต้องใช้น้ำยาเฉพาะ"),
      ];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-05]") && w.includes("อย่างไรก็ตาม"))).toBe(true);
    });

    it("ค้นสำนวนใน callout / list / table ด้วย ไม่ใช่แค่ย่อหน้า", () => {
      const blocks: SeoArticleBlock[] = [
        ...variedParagraphs(),
        { id: "c1", type: "callout", variant: "tip", runs: [{ text: "หวังว่าบทความนี้จะเป็นประโยชน์" }] },
      ];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("หวังว่าบทความนี้"))).toBe(true);
    });
  });

  describe("Boundary / Negative Cases", () => {
    it("blocks ว่าง → คืน array ว่าง ไม่ throw", () => {
      expect(detectAiToneSignals([])).toEqual([]);
    });

    it("มีแต่ heading กับ divider (ไม่มีบล็อกเนื้อหา) → คืน array ว่าง ไม่หารด้วยศูนย์", () => {
      const blocks: SeoArticleBlock[] = [heading("h1"), { id: "d1", type: "divider" }];
      expect(detectAiToneSignals(blocks)).toEqual([]);
    });

    it("ค่าที่ไม่ใช่ array → คืน array ว่าง ไม่ throw", () => {
      expect(detectAiToneSignals(undefined as unknown as SeoArticleBlock[])).toEqual([]);
    });

    it("ย่อหน้าที่มีแต่ช่องว่าง 4 ย่อหน้า (ค่าเฉลี่ยความยาว = 0) → ไม่หารด้วยศูนย์", () => {
      const blocks: SeoArticleBlock[] = [
        { id: "p1", type: "paragraph", runs: [{ text: "   " }] },
        { id: "p2", type: "paragraph", runs: [{ text: "   " }] },
        { id: "p3", type: "paragraph", runs: [{ text: "   " }] },
        { id: "p4", type: "paragraph", runs: [{ text: "   " }] },
      ];
      const warnings = detectAiToneSignals(blocks);
      expect(warnings.some((w) => w.includes("[SEO-TONE-04]"))).toBe(false);
    });
  });
});
