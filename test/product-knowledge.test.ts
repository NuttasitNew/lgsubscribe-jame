import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getProductKnowledgeGuide,
  knowledgeInventory,
  knowledgeSourceGroups,
  productKnowledgeGuides,
} from "@/lib/product-knowledge";
import { products } from "@/lib/site";

function countPdfFiles(directory: string): number {
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return total + countPdfFiles(entryPath);
    return total + (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf") ? 1 : 0);
  }, 0);
}

describe("product knowledge extracted from the supplied library", () => {
  it("accounts for every supplied PDF across the complete product catalog", () => {
    expect(knowledgeInventory.pdfCount).toBe(42);
    expect(knowledgeInventory.productPdfCount).toBe(41);
    expect(knowledgeInventory.pdfCount).toBe(countPdfFiles(join(process.cwd(), "knowledge")));
    expect(knowledgeInventory.categoryCount).toBe(13);
    expect(knowledgeInventory.modelCount).toBeGreaterThanOrEqual(45);
    expect(knowledgeSourceGroups.flatMap((group) => group.files)).toHaveLength(42);
  });

  it("keeps each category guide actionable", () => {
    expect(new Set(productKnowledgeGuides.map((guide) => guide.slug)).size).toBe(
      productKnowledgeGuides.length,
    );

    for (const guide of productKnowledgeGuides) {
      expect(guide.models.length).toBeGreaterThan(0);
      expect(guide.highlights.length).toBeGreaterThanOrEqual(4);
      expect(guide.selectionCriteria.length).toBeGreaterThanOrEqual(3);
      expect(guide.installation.length).toBeGreaterThanOrEqual(2);
      expect(guide.care.length).toBeGreaterThan(20);
    }
  });

  it("maps every published product to the matching buying guide", () => {
    for (const product of products) {
      expect(getProductKnowledgeGuide(product.category), product.category).toBeDefined();
    }
  });

  it("preserves representative model facts from the 2026 documents", () => {
    expect(getProductKnowledgeGuide("เครื่องกรองน้ำ")?.models).toContain("WD516AN");
    expect(getProductKnowledgeGuide("เครื่องซักและอบผ้า")?.models).toContain("WT1410NHEG");
    expect(productKnowledgeGuides.find((guide) => guide.slug === "monitor")?.models).toContain("32U889SA");
    expect(productKnowledgeGuides.find((guide) => guide.slug === "speakers")?.models).toEqual([
      "GRAB",
      "BOUNCE",
      "STAGE301",
    ]);
  });

  it("keeps every source manifest entry unique", () => {
    const sourceNames = knowledgeSourceGroups.flatMap((group) => group.files);
    expect(new Set(sourceNames).size).toBe(sourceNames.length);
  });
});
