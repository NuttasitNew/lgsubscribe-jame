"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalogProducts } from "@/lib/catalog-products";
import { buildProductsSearchHref, filterCatalogProducts, isProductsIndex } from "@/lib/catalog-search";
import { productKnowledgeGuides } from "@/lib/product-knowledge";

export function ProductSearchSheet({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const onListing = isProductsIndex(pathname);

  const filteredProducts = useMemo(() => filterCatalogProducts(query, category), [query, category]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function applyToListingAndClose() {
    router.replace(buildProductsSearchHref(query, category));
    setOpen(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) return;
        if (onListing) router.replace(buildProductsSearchHref(query, category));
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] bg-primary px-4 text-left text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            aria-label="ค้นหาสินค้า LG"
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15"
            >
              <Search className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium tracking-normal text-white/65">
                ค้นหาได้ทันที
              </span>
              <span className="block truncate text-sm font-bold">ชื่อ หมวด หรือรหัสรุ่น</span>
            </span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="z-[70] flex max-h-[88dvh] w-full flex-col gap-0 overflow-hidden rounded-t-[2rem] border-t bg-[#f7f5f2] px-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:max-w-none"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300" />
        <SheetHeader className="px-4 text-left">
          <SheetTitle className="text-2xl font-bold">ค้นหาสินค้า LG</SheetTitle>
          <SheetDescription className="mt-1 leading-6">
            พิมพ์ชื่อ รหัสรุ่น หรือเลือกหมวด แล้วเลือกรุ่นที่ต้องการ
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid gap-3 px-4">
          <label className="relative min-w-0">
            <span className="sr-only">ค้นหาสินค้า LG</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red-700"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อสินค้า หมวด หรือรหัสรุ่น"
              className="h-14 w-full rounded-2xl border border-black/15 bg-white pl-12 pr-12 text-base font-semibold text-neutral-950 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-neutral-400 focus:border-red-700 focus:ring-4 focus:ring-red-700/10 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-neutral-500 transition hover:bg-black/5 hover:text-neutral-950"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              aria-label="กรองตามหมวดสินค้า"
              className="h-14 gap-2 rounded-2xl border-black/15 bg-white px-4 text-sm font-bold text-neutral-950 shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[70] rounded-2xl border-black/10 bg-white">
              <SelectItem value="all" className="font-semibold">
                ทั้งหมด ({catalogProducts.length})
              </SelectItem>
              {productKnowledgeGuides.map((guide) => (
                <SelectItem key={guide.slug} value={guide.category} className="font-semibold">
                  {guide.category} ({guide.models.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex items-center justify-between px-4">
          <p className="text-sm font-semibold text-neutral-500">{filteredProducts.length} รุ่น</p>
          {onListing ? (
            <button type="button" onClick={applyToListingAndClose} className="text-sm font-bold text-red-700">
              ดูบนหน้าสินค้า
            </button>
          ) : (
            <Link
              href={buildProductsSearchHref(query, category)}
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-red-700"
            >
              ดูบนหน้าสินค้า
            </Link>
          )}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4">
          {filteredProducts.length > 0 ? (
            <div className="grid gap-2 pb-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}/`}
                  onClick={() => setOpen(false)}
                  data-testid="product-search-result"
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-2.5"
                >
                  <span className="relative block aspect-square w-[4.5rem] overflow-hidden rounded-xl bg-white">
                    <Image
                      src={product.promotionImage ?? product.image}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-contain"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                      {product.category}
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold leading-5 text-neutral-900">
                      {product.name}
                    </span>
                    <span className="mt-1 block text-xs text-neutral-500">{product.model}</span>
                  </span>
                  <ArrowRight className="size-4 text-primary" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white px-5 py-10 text-center">
              <p className="font-bold text-neutral-950">ยังไม่พบสินค้าที่ตรงกับคำค้นหา</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                ลองค้นหาด้วยชื่อหมวด เช่น “ตู้เย็น” หรือรหัสรุ่นที่อยู่บนสินค้า
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
