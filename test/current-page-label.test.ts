import { describe, expect, it } from "vitest";
import { getCurrentPageLabel } from "@/lib/current-page-label";

describe("getCurrentPageLabel", () => {
  it("maps static routes with or without a trailing slash", () => {
    expect(getCurrentPageLabel("/")).toBe("หน้าแรก");
    expect(getCurrentPageLabel("/products/")).toBe("สินค้าทั้งหมด");
    expect(getCurrentPageLabel("/terms")).toBe("เงื่อนไขการเช่าใช้");
  });

  it("uses the product name on a product detail route", () => {
    expect(getCurrentPageLabel("/products/lg-puricare-wd516/")).toBe(
      "เครื่องกรองน้ำ LG PuriCare รุ่น WD516",
    );
  });

  it("keeps a readable fallback for an unknown route", () => {
    expect(getCurrentPageLabel("/unknown/")).toBe("หน้าเว็บไซต์");
  });
});
