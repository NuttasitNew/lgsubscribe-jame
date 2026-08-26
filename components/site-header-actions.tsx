"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { ProductSearchSheet } from "@/components/product-search-sheet";
import { isProductsSection } from "@/lib/catalog-search";

export function SiteHeaderActions() {
  const pathname = usePathname();

  if (isProductsSection(pathname)) {
    return (
      <ProductSearchSheet>
        <button
          type="button"
          aria-label="ค้นหาสินค้า"
          className="inline-flex items-center gap-1.5 rounded-[5px] border border-black/10 bg-white px-3 py-2 text-xs font-bold text-neutral-800 xl:hidden"
        >
          <Search className="size-4" aria-hidden="true" />
          ค้นหา
        </button>
      </ProductSearchSheet>
    );
  }

  return (
    <Link
      href="/products/"
      className="rounded-[5px] border border-black/10 bg-white px-4 py-2 text-xs font-bold text-neutral-800 xl:hidden"
    >
      สินค้า
    </Link>
  );
}
