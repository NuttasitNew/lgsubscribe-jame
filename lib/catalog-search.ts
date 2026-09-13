import { catalogProducts } from "@/lib/catalog-products";
import type { Product } from "@/lib/site";

export function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("th-TH");
}

export { isProductsSection, isProductsIndex, buildProductsSearchHref } from "./catalog-routes";

export function filterCatalogProducts(query: string, category = "all"): Product[] {
  const normalizedQuery = normalizeSearchValue(query);

  return catalogProducts.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const searchableText = normalizeSearchValue(
      [product.name, product.model, product.category, product.description, ...product.highlights].join(" "),
    );

    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
}
