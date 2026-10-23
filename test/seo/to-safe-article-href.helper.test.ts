/**
 * Unit Tests สำหรับ to-safe-article-href.helper.ts + การกรอง link ใน seo-article-block-schema
 *
 * @logic ที่ต้อง verify:
 * - ผ่านเฉพาะ http/https และ path ภายในที่ขึ้นต้น "/" (ไม่ใช่ "//" protocol-relative)
 * - scheme อันตราย (javascript:, data:, vbscript:) ถูกตัดทิ้งทุกรูปแบบ รวมทั้งตัวพิมพ์ผสมและช่องว่างนำหน้า
 * - schema ของ run ต้อง reject link อันตรายตั้งแต่ตอนบันทึก contentJson
 *   (renderer ฝั่งเว็บใส่ค่านี้ลง href ตรง ๆ ห้ามพึ่ง safeguard ของ React เป็นด่านเดียว)
 *
 * @related
 * - ทดสอบ: {@link @/feature/backoffice/seo/seo-article/helper/to-safe-article-href.helper.ts}
 * - schema: {@link @/feature/backoffice/seo/seo-article/constant/seo-article-block-schema.ts}
 * - renderer ฝั่งเว็บ: hurry-web app/[locale]/blog/_components/block-renderer/text-runs.tsx
 */
import { describe, expect, it } from "vitest";
import {
  isSafeArticleHref,
  toSafeArticleHref,
} from "@/feature/backoffice/seo/seo-article/helper/to-safe-article-href.helper";
import { seoArticleTextRunSchema } from "@/feature/backoffice/seo/seo-article/constant/seo-article-block-schema";

describe("toSafeArticleHref", () => {
  it("ผ่าน http/https และ path ภายใน พร้อม trim ช่องว่าง", () => {
    expect(toSafeArticleHref("https://hurrycleanthailand.com/blog/a")).toBe("https://hurrycleanthailand.com/blog/a");
    expect(toSafeArticleHref("http://example.com")).toBe("http://example.com");
    expect(toSafeArticleHref("HTTPS://example.com")).toBe("HTTPS://example.com");
    expect(toSafeArticleHref("  /blog/a  ")).toBe("/blog/a");
  });

  it("ตัด scheme อันตรายทุกรูปแบบ", () => {
    expect(toSafeArticleHref("javascript:alert(1)")).toBeNull();
    expect(toSafeArticleHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(toSafeArticleHref("  javascript:alert(1)")).toBeNull();
    expect(toSafeArticleHref("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(toSafeArticleHref("vbscript:msgbox(1)")).toBeNull();
  });

  it("ตัด protocol-relative และรูปแบบที่ไม่ใช่ลิงก์", () => {
    expect(toSafeArticleHref("//evil.com")).toBeNull();
    expect(toSafeArticleHref("blog/a")).toBeNull(); // relative ไม่ขึ้นต้น / — เว็บไม่รับ
    expect(toSafeArticleHref("#faq")).toBeNull();
    expect(toSafeArticleHref("")).toBeNull();
    expect(toSafeArticleHref(undefined)).toBeNull();
  });
});

describe("isSafeArticleHref", () => {
  it("ไม่มีลิงก์ / ลิงก์ว่าง = ผ่าน (field เป็น optional)", () => {
    expect(isSafeArticleHref(undefined)).toBe(true);
    expect(isSafeArticleHref("")).toBe(true);
    expect(isSafeArticleHref("   ")).toBe(true);
  });

  it("ลิงก์ปลอดภัย = ผ่าน / ลิงก์อันตราย = ไม่ผ่าน", () => {
    expect(isSafeArticleHref("/blog/a")).toBe(true);
    expect(isSafeArticleHref("https://example.com")).toBe(true);
    expect(isSafeArticleHref("javascript:alert(1)")).toBe(false);
    expect(isSafeArticleHref("data:text/html,x")).toBe(false);
    expect(isSafeArticleHref("//evil.com")).toBe(false);
  });
});

describe("seoArticleTextRunSchema — กรอง link ตอนบันทึก", () => {
  it("run ที่ไม่มีลิงก์ หรือลิงก์ปลอดภัย ผ่าน", () => {
    expect(seoArticleTextRunSchema.safeParse({ text: "สวัสดี" }).success).toBe(true);
    expect(seoArticleTextRunSchema.safeParse({ text: "ดูที่นี่", link: "/blog/a" }).success).toBe(true);
    expect(seoArticleTextRunSchema.safeParse({ text: "ดูที่นี่", link: "https://example.com" }).success).toBe(true);
  });

  it("run ที่ลิงก์เป็น javascript:/data:/protocol-relative ถูก reject", () => {
    expect(seoArticleTextRunSchema.safeParse({ text: "กด", link: "javascript:alert(1)" }).success).toBe(false);
    expect(seoArticleTextRunSchema.safeParse({ text: "กด", link: "data:text/html,x" }).success).toBe(false);
    expect(seoArticleTextRunSchema.safeParse({ text: "กด", link: "//evil.com" }).success).toBe(false);
  });
});
