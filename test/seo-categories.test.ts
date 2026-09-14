import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { seoCategories } from "@/lib/seo-categories";
import { allProducts } from "@/lib/catalog-products";
import { generateMetadata } from "@/app/(public)/categories/[slug]/page";

describe("public category discovery", () => {
  it.each(seoCategories)("$slug has products, a unique canonical and sitemap entry", async (category) => {
    expect(allProducts.filter((p) => p.category === category.category).length).toBeGreaterThan(0);
    const path = `/categories/${category.slug}/`;
    expect(
      (await generateMetadata({ params: Promise.resolve({ slug: category.slug }) })).alternates?.canonical,
    ).toBe(path);
    expect(sitemap().some((row) => new URL(row.url).pathname === path)).toBe(true);
  });
});
