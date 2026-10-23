import { describe, expect, it } from "vitest";
import { readSeoArticleDraft } from "@/feature/backoffice/seo/seo-article/helper/read-seo-article-draft.helper";
import type { SeoArticleEditSnapshot } from "@/lib/seo/helper/is-seo-article-edit-equal";

const CONTENT_UPDATED_AT = "2026-07-24T10:00:00.000Z";

/** ร่างขั้นต่ำที่ผ่าน schema เนื้อหา — เทสต์สนใจ meta รอบ ๆ ไม่ใช่โครงบล็อก */
const buildSnapshot = (patch: Partial<SeoArticleEditSnapshot> = {}): SeoArticleEditSnapshot => ({
  title: "ชื่อบทความ",
  slug: "article-slug",
  metaDescription: "คำอธิบาย",
  keywords: ["ซักที่นอน"],
  content: {
    version: 2,
    category: "careTips",
    blocks: [{ id: "b1", type: "paragraph", runs: [{ text: "เนื้อหา" }] }],
    faq: [],
  },
  ...patch,
});

describe("readSeoArticleDraft", () => {
  it("ไม่มีร่างในฐาน → คืนค่าว่าง", () => {
    const result = readSeoArticleDraft({
      draftJson: null,
      draftSavedAt: null,
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result).toEqual({ snapshot: null, savedAt: null, savedBy: null, isOutdated: false });
  });

  it("มีร่างแต่ไม่มีเวลาเซฟ → ถือว่าไม่มีร่าง (อ่านไม่ได้ว่าเก่าหรือใหม่กว่าเนื้อจริง)", () => {
    const result = readSeoArticleDraft({
      draftJson: buildSnapshot(),
      draftSavedAt: null,
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result.snapshot).toBeNull();
  });

  it("ร่างที่เซฟหลังเนื้อจริงถูกแก้ → ใช้ได้ ไม่ล้าสมัย", () => {
    const result = readSeoArticleDraft({
      draftJson: buildSnapshot({ title: "ชื่อที่แก้ค้างไว้" }),
      draftSavedAt: "2026-07-24T10:05:00.000Z",
      draftSavedBy: "นัท",
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result.snapshot?.title).toBe("ชื่อที่แก้ค้างไว้");
    expect(result.savedBy).toBe("นัท");
    expect(result.isOutdated).toBe(false);
  });

  it("ร่างที่เซฟก่อนเนื้อจริงถูกแก้ → ล้าสมัย (กันกดบันทึกทับรูปที่ AI เพิ่ง gen)", () => {
    const result = readSeoArticleDraft({
      draftJson: buildSnapshot(),
      draftSavedAt: "2026-07-24T09:00:00.000Z",
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result.snapshot).not.toBeNull();
    expect(result.isOutdated).toBe(true);
  });

  it("เซฟพร้อมกันพอดี → ยังไม่ถือว่าล้าสมัย ไม่ต้องรบกวนผู้ใช้", () => {
    const result = readSeoArticleDraft({
      draftJson: buildSnapshot(),
      draftSavedAt: CONTENT_UPDATED_AT,
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result.isOutdated).toBe(false);
  });

  it("โครงเนื้อหาในร่างพัง → คืนค่าว่าง ไม่โยน error (ห้ามทำให้เปิดหน้าแก้ไขไม่ได้)", () => {
    const result = readSeoArticleDraft({
      draftJson: { title: "มีแต่ชื่อ", content: { version: 2, blocks: "ไม่ใช่ array" } },
      draftSavedAt: "2026-07-24T10:05:00.000Z",
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result.snapshot).toBeNull();
  });

  it("meta ที่ผิดชนิดถูกแทนด้วยค่าว่าง ไม่ทำให้ร่างทั้งก้อนใช้ไม่ได้", () => {
    const result = readSeoArticleDraft({
      draftJson: { ...buildSnapshot(), title: 123, keywords: ["ok", 5, null] },
      draftSavedAt: "2026-07-24T10:05:00.000Z",
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result.snapshot?.title).toBe("");
    expect(result.snapshot?.keywords).toEqual(["ok"]);
  });

  it("เก็บ meta EN ไว้ครบเมื่อร่างมีค่านั้น", () => {
    const result = readSeoArticleDraft({
      draftJson: buildSnapshot({ titleEn: "EN title", metaDescriptionEn: "EN desc", keywordsEn: ["mattress"] }),
      draftSavedAt: "2026-07-24T10:05:00.000Z",
      contentUpdatedAt: CONTENT_UPDATED_AT,
    });

    expect(result.snapshot?.titleEn).toBe("EN title");
    expect(result.snapshot?.keywordsEn).toEqual(["mattress"]);
  });
});

it.each(["ซักเบาะ", null, undefined])("preserves primary keyword semantics (%s)", (targetKeyword) => {
  const result = readSeoArticleDraft({
    draftJson: buildSnapshot({ targetKeyword }),
    draftSavedAt: CONTENT_UPDATED_AT,
    contentUpdatedAt: CONTENT_UPDATED_AT,
  });
  expect(result.snapshot?.targetKeyword).toBe(targetKeyword);
});
