import { catalogProducts } from "@/lib/catalog-products";
import type { Product } from "@/lib/site";

export function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("th-TH");
}

export function isProductsSection(pathname: string) {
  const normalized = pathname === "/" ? pathname : pathname.replace(/\/$/, "");
  return normalized === "/products" || normalized.startsWith("/products/");
}

export function isProductsIndex(pathname: string) {
  const normalized = pathname === "/" ? pathname : pathname.replace(/\/$/, "");
  return normalized === "/products";
}

export function buildProductsSearchHref(query: string, category = "all") {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) params.set("q", trimmedQuery);
  if (category && category !== "all") params.set("category", category);

  const qs = params.toString();
  return qs ? `/products/?${qs}` : "/products/";
}

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
