"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { buildProductsSearchHref } from "@/lib/catalog-routes";

export function ProductCatalogBackLink() {
  const params = useSearchParams();
  const href = buildProductsSearchHref(params.get("q") ?? "", params.get("category") ?? "all");

  return (
    <Button asChild variant="ghost" className="-ml-3 shrink-0 text-muted-foreground">
      <Link href={href}>
        <span aria-hidden="true">←</span>
        สินค้าทั้งหมด
      </Link>
    </Button>
  );
}
