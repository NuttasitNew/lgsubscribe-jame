import { describe, expect, it } from "vitest";
import { collectArticleTextUnits } from "@/feature/backoffice/seo/seo-article/helper/article-text-units.helper";
import { applyArticleTextUnits } from "@/feature/backoffice/seo/seo-article/helper/apply-article-text-units.helper";
import { buildArticleEnSourceHash } from "@/feature/backoffice/seo/seo-article/helper/article-en-source-hash.helper";
import type { SeoArticleBlockContent } from "@/feature/backoffice/seo/seo-article/type/seo-article-block.type";

/** บทความตัวอย่างที่มีครบทุกชนิดบล็อกที่กินช่องข้อความ + รูป + divider */
const buildContent = (): SeoArticleBlockContent => ({
  version: 2,
  category: "careTips",
  coverImage: "https://cdn.example.com/cover.webp",
  coverImageAlt: "ปกไทย",
  blocks: [
    { id: "h1", type: "heading", level: 2, runs: [{ text: "วิธีซักโซฟา" }] },
    {
      id: "p1",
      type: "paragraph",
      runs: [
        { text: "เริ่มจาก", bold: true },
        { text: "ดูดฝุ่นก่อน", link: "/service" },
      ],
    },
    { id: "l1", type: "bulletList", items: [{ runs: [{ text: "เตรียมผ้า" }] }, { runs: [{ text: "เตรียมน้ำยา" }] }] },
    {
      id: "t1",
      type: "table",
      rows: [
        {
          cells: [
            { runs: [{ text: "ชนิดผ้า" }], isHeader: true },
            { runs: [{ text: "เวลา" }], isHeader: true },
          ],
        },
        { cells: [{ runs: [{ text: "กำมะหยี่" }] }, { runs: [{ text: "15 นาที" }] }] },
      ],
    },
    { id: "i1", type: "image", url: "https://cdn.example.com/a.webp", alt: "ช่างซักโซฟา", caption: "หน้างานจริง" },
    { id: "d1", type: "divider" },
    { id: "c1", type: "callout", variant: "warn", runs: [{ text: "ห้ามขัดแรง" }] },
  ],
  faq: [{ question: "ใช้เวลานานไหม", answer: "ประมาณ 2 ชั่วโมง" }],
});

describe("collectArticleTextUnits", () => {
  it("เก็บข้อความครบทุกชนิดบล็อกตามลำดับที่เดินโครง", () => {
    expect(collectArticleTextUnits(buildContent())).toEqual([
      "วิธีซักโซฟา",
      "เริ่มจาก",
      "ดูดฝุ่นก่อน",
      "เตรียมผ้า",
      "เตรียมน้ำยา",
      "ชนิดผ้า",
      "เวลา",
      "กำมะหยี่",
      "15 นาที",
      "ช่างซักโซฟา",
      "หน้างานจริง",
      "ห้ามขัดแรง",
      "ใช้เวลานานไหม",
      "ประมาณ 2 ชั่วโมง",
    ]);
  });

  it("divider ไม่กินช่อง แต่รูปกิน 2 ช่องเสมอแม้ไม่มี caption", () => {
    const content: SeoArticleBlockContent = {
      ...buildContent(),
      blocks: [
        { id: "d", type: "divider" },
        { id: "i", type: "image", url: "u", alt: "เอ" },
      ],
      faq: [],
    };

    expect(collectArticleTextUnits(content)).toEqual(["เอ", ""]);
  });
});

describe("applyArticleTextUnits", () => {
  it("แทนข้อความครบทุกช่องโดยโครงสร้าง/รูป/ลิงก์/ตัวหนา ไม่เปลี่ยน", () => {
    const content = buildContent();
    const translated = collectArticleTextUnits(content).map((text) => `EN:${text}`);

    const result = applyArticleTextUnits(content, translated);

    expect(collectArticleTextUnits(result)).toEqual(translated);
    // โครงสร้างต้องเหมือนเดิมเป๊ะ
    expect(result.blocks.map((block) => block.type)).toEqual(content.blocks.map((block) => block.type));
    const image = result.blocks.find((block) => block.type === "image");
    expect(image).toMatchObject({ url: "https://cdn.example.com/a.webp" });
    const paragraph = result.blocks.find((block) => block.type === "paragraph");
    expect(paragraph).toMatchObject({ runs: [{ bold: true }, { link: "/service" }] });
  });

  it("แปลมาไม่ครบ → ช่องที่ขาดใช้ข้อความเดิม ไม่กลายเป็นค่าว่าง", () => {
    const content = buildContent();

    const result = applyArticleTextUnits(content, ["EN heading"]);
    const units = collectArticleTextUnits(result);

    expect(units[0]).toBe("EN heading");
    expect(units[1]).toBe("เริ่มจาก");
    expect(units.at(-1)).toBe("ประมาณ 2 ชั่วโมง");
  });

  it("ไม่แก้ของเดิมในที่ — ฉบับไทยต้องไม่ถูกแตะ", () => {
    const content = buildContent();

    applyArticleTextUnits(
      content,
      collectArticleTextUnits(content).map(() => "x")
    );

    expect(collectArticleTextUnits(content)[0]).toBe("วิธีซักโซฟา");
  });
});

describe("buildArticleEnSourceHash", () => {
  const base = { title: "ซักโซฟา", metaDescription: "วิธีซักโซฟาเอง", content: buildContent() };

  it("เนื้อเดิม = hash เดิม", () => {
    expect(buildArticleEnSourceHash(base)).toBe(buildArticleEnSourceHash({ ...base, content: buildContent() }));
  });

  it("แก้ข้อความในบล็อก → hash เปลี่ยน", () => {
    const changed = buildContent();
    changed.blocks[0] = { id: "h1", type: "heading", level: 2, runs: [{ text: "วิธีซักที่นอน" }] };

    expect(buildArticleEnSourceHash({ ...base, content: changed })).not.toBe(buildArticleEnSourceHash(base));
  });

  it("เปลี่ยนรูป/ลิงก์/ตัวหนา → hash ไม่เปลี่ยน (ไม่กระทบคำแปล)", () => {
    const changed = buildContent();
    changed.blocks[4] = {
      id: "i1",
      type: "image",
      url: "https://cdn.example.com/NEW.webp",
      alt: "ช่างซักโซฟา",
      caption: "หน้างานจริง",
    };
    changed.blocks[1] = {
      id: "p1",
      type: "paragraph",
      runs: [{ text: "เริ่มจาก" }, { text: "ดูดฝุ่นก่อน", link: "/other", italic: true }],
    };

    expect(buildArticleEnSourceHash({ ...base, content: changed })).toBe(buildArticleEnSourceHash(base));
  });
});
