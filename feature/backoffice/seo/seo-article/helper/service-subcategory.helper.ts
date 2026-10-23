import { allProducts } from "@/lib/catalog-products";
import { productKnowledgeGuides, type ProductKnowledgeGuide } from "@/lib/product-knowledge";
import type { Product } from "@/lib/site";
import type { ServiceSubcategoryOption } from "../type/service-category-option.type";

/**
 * lg-jame version of hmp-frontend's service taxonomy: a "category" is a product category from the
 * catalog (productKnowledgeGuides, code = guide.slug) and a "subcategory" is one product model in it.
 * Prices are the monthly LG Subscribe starting prices. There are no order counts in lg-jame, so
 * every count that used to come from orders is 0.
 */
export interface CatalogCategory {
  categoryCode: string;
  categoryName: string;
  guide: ProductKnowledgeGuide;
  products: Product[];
}

export const listCatalogCategories = (): CatalogCategory[] =>
  productKnowledgeGuides
    .map((guide) => ({
      categoryCode: guide.slug,
      categoryName: guide.category,
      guide,
      products: allProducts.filter((product) => product.category === guide.category),
    }))
    .filter((category) => category.products.length > 0);

export const findCatalogCategory = (categoryCode: string): CatalogCategory | null =>
  listCatalogCategories().find((category) => category.categoryCode === categoryCode) ?? null;

/** Display name for a product row in prompts and pickers, e.g. "LG PuriCare รุ่น WD518AN". */
export const catalogProductLabel = (product: Pick<Product, "name">): string => product.name.trim();

export interface ServiceSubcategoryDefinition {
  subcategoryName: string;
  patterns: string[];
}

/**
 * @description ตรวจและจัดรูปแบบรายชื่อรุ่นสินค้าที่เลือกจาก input ภายนอก
 * @returns รายชื่อที่ normalize แล้ว (array ว่าง = ทั้งหมวด) หรือ null เมื่อรูปแบบไม่ถูกต้อง
 */
export const normalizeServiceSubcategoryNames = (value: unknown): string[] | null => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((name) => typeof name !== "string")) return null;
  return [...new Set(value.map((name) => name.trim()).filter(Boolean))];
};

/** One definition per product model in the catalog category. */
export const getServiceSubcategoryDefinitions = (categoryCode: string): ServiceSubcategoryDefinition[] =>
  (findCatalogCategory(categoryCode)?.products ?? []).map((product) => ({
    subcategoryName: catalogProductLabel(product),
    patterns: [catalogProductLabel(product), product.model],
  }));

export const matchesServiceSubcategory = (
  serviceName: string | null | undefined,
  definition: ServiceSubcategoryDefinition
): boolean => {
  const normalizedName = serviceName?.trim() ?? "";
  return normalizedName.length > 0 && definition.patterns.some((pattern) => normalizedName.includes(pattern));
};

export const buildServiceSubcategoryOptions = (categoryCode: string): ServiceSubcategoryOption[] =>
  (findCatalogCategory(categoryCode)?.products ?? []).map((product) => ({
    subcategoryName: catalogProductLabel(product),
    serviceCount: 1,
    orderCount: 0,
    minPrice: product.monthlyPrice,
    maxPrice: product.monthlyPrice,
  }));
