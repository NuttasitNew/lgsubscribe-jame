import { describe, expect, it } from "vitest";
import { readSeoArticleEnMeta } from "@/feature/backoffice/seo/seo-article/helper/read-seo-article-en-meta.helper";

describe("readSeoArticleEnMeta", () => {
  it("แถวเก่าที่ยังไม่มีคอลัมน์ EN → คืนค่าว่างทั้งชุด (ฟอร์มต้องเปิดได้ ไม่ crash)", () => {
    expect(readSeoArticleEnMeta({ title: "ล้างโซฟา", keywords: ["ล้างโซฟา"] })).toEqual({
      titleEn: "",
      metaDescriptionEn: "",
      keywordsEn: [],
    });
  });

  it("null / undefined → คืนค่าว่างทั้งชุด", () => {
    expect(readSeoArticleEnMeta(null)).toEqual({ titleEn: "", metaDescriptionEn: "", keywordsEn: [] });
    expect(readSeoArticleEnMeta(undefined)).toEqual({ titleEn: "", metaDescriptionEn: "", keywordsEn: [] });
  });

  it("แถวที่มีค่า EN ครบ → คืนตามจริง", () => {
    expect(
      readSeoArticleEnMeta({
        titleEn: "How to Clean a Sofa",
        metaDescriptionEn: "A practical guide.",
        keywordsEn: ["sofa cleaning", "fabric sofa"],
      })
    ).toEqual({
      titleEn: "How to Clean a Sofa",
      metaDescriptionEn: "A practical guide.",
      keywordsEn: ["sofa cleaning", "fabric sofa"],
    });
  });

  it("คอลัมน์ EN เป็น null (ค่าปกติของบทความไทยล้วน) → คืนสตริงว่าง ไม่ใช่ null", () => {
    expect(readSeoArticleEnMeta({ titleEn: null, metaDescriptionEn: null, keywordsEn: [] })).toEqual({
      titleEn: "",
      metaDescriptionEn: "",
      keywordsEn: [],
    });
  });

  it("keywordsEn ที่มีค่าขยะ/ช่องว่าง → ถูกคัดทิ้ง ไม่ให้ไหลไปเป็นคำค้นบนเว็บ", () => {
    expect(readSeoArticleEnMeta({ keywordsEn: ["sofa", "   ", 42, null, "care"] }).keywordsEn).toEqual([
      "sofa",
      "care",
    ]);
  });
});
