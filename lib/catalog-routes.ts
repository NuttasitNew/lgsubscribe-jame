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

  if (trimmedQuery) params.set("q", query);
  if (category && category !== "all") params.set("category", category);

  const qs = params.toString();
  return qs ? `/products/?${qs}` : "/products/";
}

export function buildProductDetailHref(slug: string, query: string, category = "all") {
  const listingHref = buildProductsSearchHref(query, category);
  const search = listingHref.split("?")[1];
  return `/products/${slug}/${search ? `?${search}` : ""}`;
}
