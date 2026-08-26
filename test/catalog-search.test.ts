import { describe, expect, it } from "vitest";
import {
  buildProductsSearchHref,
  filterCatalogProducts,
  isProductsIndex,
  isProductsSection,
} from "@/lib/catalog-search";

describe("catalog search helpers", () => {
  it("recognizes listing and detail product routes", () => {
    expect(isProductsSection("/products/")).toBe(true);
    expect(isProductsSection("/products/lg-saq13a/")).toBe(true);
    expect(isProductsSection("/contact/")).toBe(false);
    expect(isProductsIndex("/products/")).toBe(true);
    expect(isProductsIndex("/products/lg-saq13a/")).toBe(false);
  });

  it("filters by model code and category", () => {
    expect(filterCatalogProducts("AS35GGW10")).toHaveLength(1);
    expect(filterCatalogProducts("", "เครื่องฟอกอากาศ")).toHaveLength(6);
    expect(filterCatalogProducts("ไม่มีรุ่นนี้เลย")).toHaveLength(0);
  });

  it("builds a products listing href from the current finder", () => {
    expect(buildProductsSearchHref("")).toBe("/products/");
    expect(buildProductsSearchHref("SAQ13A")).toBe("/products/?q=SAQ13A");
    expect(buildProductsSearchHref("", "เครื่องฟอกอากาศ")).toBe(
      "/products/?category=%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%9F%E0%B8%AD%E0%B8%81%E0%B8%AD%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A8",
    );
  });
});
