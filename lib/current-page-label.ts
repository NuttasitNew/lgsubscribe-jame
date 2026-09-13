import { allProducts } from "@/lib/catalog-products";
import { getStaticPageLabel } from "@/lib/static-page-label";

export function getCurrentPageLabel(pathname: string) {
  const normalizedPathname = pathname === "/" ? pathname : pathname.replace(/\/$/, "");
  const currentProduct = allProducts.find((product) => `/products/${product.slug}` === normalizedPathname);
  return currentProduct?.name ?? getStaticPageLabel(pathname);
}
