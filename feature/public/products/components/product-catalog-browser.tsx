"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { SiteViewStats } from "@/components/live-view-count";
import { ProductCard } from "@/components/product-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalogProducts } from "@/lib/catalog-products";
import { filterCatalogProducts, normalizeSearchValue } from "@/lib/catalog-search";
import { productKnowledgeGuides } from "@/lib/product-knowledge";

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function scrollWindowToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

export function ProductCatalogBrowser() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "all";
  const [query, setQuery] = useState(urlQuery);
  const [activeCategory, setActiveCategory] = useState(urlCategory);
  const previousFilter = useRef({ query: "", category: "all" });

  useEffect(() => {
    setQuery(urlQuery);
    setActiveCategory(urlCategory);
  }, [urlCategory, urlQuery]);

  const normalizedQuery = normalizeSearchValue(query);
  const hasActiveFilter = activeCategory !== "all" || normalizedQuery.length > 0;

  useLayoutEffect(() => {
    const previous = previousFilter.current;
    const filterChanged = previous.query !== normalizedQuery || previous.category !== activeCategory;
    previousFilter.current = { query: normalizedQuery, category: activeCategory };

    if (!filterChanged) return;

    scrollWindowToTop();
  }, [activeCategory, normalizedQuery]);

  const filteredProducts = useMemo(
    () => filterCatalogProducts(query, activeCategory),
    [activeCategory, query],
  );

  const visibleGroups = hasActiveFilter
    ? [
        {
          slug: "search-results",
          category: activeCategory === "all" ? "ผลการค้นหา" : activeCategory,
          products: filteredProducts,
        },
      ]
    : productKnowledgeGuides.map((guide) => ({
        slug: guide.slug,
        category: guide.category,
        products: catalogProducts.filter((product) => product.category === guide.category),
      }));

  return (
    <section
      id="product-knowledge"
      className="scroll-mt-[76px] bg-[#f4f1ed]"
      aria-label="รายการสินค้าจากเอกสาร"
    >
      <div
        id="catalog-search"
        className="sticky top-[76px] z-30 hidden scroll-mt-[92px] border-b border-black/10 bg-white/95 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:block lg:py-5"
      >
        <div className="container-page">
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">ค้นหาสินค้า LG</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red-700"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาชื่อสินค้า หมวด หรือรหัสรุ่น"
                className="h-14 w-full rounded-2xl border border-black/15 bg-[#faf9f7] pl-12 pr-12 text-base font-semibold text-neutral-950 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-neutral-400 focus:border-red-700 focus:bg-white focus:ring-4 focus:ring-red-700/10 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="ล้างคำค้นหา"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-neutral-500 transition hover:bg-black/5 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div className="w-[11.25rem] shrink-0 sm:w-60 lg:w-72">
              <Select value={activeCategory} onValueChange={setActiveCategory}>
                <SelectTrigger
                  aria-label="กรองตามหมวดสินค้า"
                  data-testid="category-filter"
                  className="h-14 gap-2 rounded-2xl border-black/15 bg-[#faf9f7] px-4 text-sm font-bold text-neutral-950 shadow-none transition focus:border-red-700 focus:bg-white focus:ring-4 focus:ring-red-700/10 [&>span]:line-clamp-none [&>span]:block [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left [&>svg]:size-4 [&>svg]:shrink-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60] rounded-2xl border-black/10 bg-white">
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
          </div>
        </div>
      </div>

      <div className="container-page py-5">
        <SiteViewStats className="mb-5 sm:mb-6" />
        {filteredProducts.length > 0 ? (
          <div className="grid gap-10 sm:gap-12">
            {visibleGroups.map((group, groupIndex) => (
              <section
                key={group.slug}
                id={`catalog-${group.slug}`}
                aria-labelledby={`catalog-${group.slug}-title`}
                className="scroll-mt-[92px] lg:scroll-mt-[180px]"
              >
                <div className="flex items-end justify-between gap-3 border-b border-black/10 pb-4 sm:pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
                      {hasActiveFilter ? "เลือกสินค้า LG" : `หมวด ${String(groupIndex + 1).padStart(2, "0")}`}
                    </p>
                    <h2
                      id={`catalog-${group.slug}-title`}
                      className="mt-2 text-2xl font-bold text-neutral-950 sm:text-3xl"
                    >
                      {group.category}
                    </h2>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-neutral-500">
                    {group.products.length} รุ่น
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  {group.products.map((product, index) => (
                    <div key={product.slug} data-testid="catalog-model-card">
                      <ProductCard product={product} eager={groupIndex === 0 && index === 0} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
            <p className="text-xl font-bold text-neutral-950">ยังไม่พบสินค้าที่ตรงกับคำค้นหา</p>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              ลองค้นหาด้วยชื่อหมวด เช่น “ตู้เย็น” หรือรหัสรุ่นที่อยู่บนสินค้า
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory("all");
              }}
              className="mt-6 h-11 rounded-xl bg-red-700 px-5 text-sm font-bold text-white transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            >
              ดูสินค้าทั้งหมด
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
