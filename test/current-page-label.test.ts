import { describe, expect, it } from "vitest";
import { getCurrentPageLabel } from "@/lib/current-page-label";

describe("getCurrentPageLabel", () => {
  it("maps static routes with or without a trailing slash", () => {
    expect(getCurrentPageLabel("/")).toBe("หน้าแรก");
    expect(getCurrentPageLabel("/products/")).toBe("สินค้าทั้งหมด");
    expect(getCurrentPageLabel("/faq/")).toBe("คำถามที่พบบ่อย");
    expect(getCurrentPageLabel("/authorized/")).toBe("ความน่าเชื่อถือ");
  });

  it("uses the product name on a product detail route", () => {
    expect(getCurrentPageLabel("/products/lg-puricare-wd516/")).toContain("WD516");
    expect(getCurrentPageLabel("/products/lg-saq13a/")).toContain("DUALCOOL AI Air");
  });

  it("keeps a readable fallback for an unknown route", () => {
    expect(getCurrentPageLabel("/unknown/")).toBe("หน้าเว็บไซต์");
  });
});
