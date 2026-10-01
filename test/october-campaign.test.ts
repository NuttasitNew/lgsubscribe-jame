import { describe, expect, it } from "vitest";
import { allProducts, catalogProducts } from "@/lib/catalog-products";
import { filterCatalogProducts } from "@/lib/catalog-search";
import { octSubscriptionCampaignProducts } from "@/lib/oct-subscription-campaign";
import { promotionImageAssets } from "@/lib/promotion-image-assets";
import ProductDetailPage, {
  generateStaticParams,
} from "@/feature/public/products/components/product-detail-page";
import sitemap from "@/app/sitemap";

const removedModels = [
  "TX2315DT5G",
  "WT2520NHEN",
  "85QNED80BSA",
  "75NU855BPSA",
  "65NU855BPSA",
  "AS60GHWG0",
  "L257SFZW",
  "OLED55C6PSA",
  "OLED55C6PSA.S30A",
  "100MRGB96BS",
  "RV10VHP2B",
  "PTOL24FFCBB",
  "34U650A-B",
  "ZTRQ36GYLA1",
  "ZTRQ48GYLA1",
];

describe("October sales catalog", () => {
  it("publishes the reviewed 67 artworks for 68 products, sharing the water-purifier artwork", () => {
    expect(octSubscriptionCampaignProducts).toHaveLength(67);
    expect(promotionImageAssets).toHaveLength(67);
    expect(catalogProducts).toHaveLength(68);
    expect(allProducts.every((product) => product.promotionImage?.includes("/oct-2026/"))).toBe(true);
  });

  it.each(removedModels)("removes %s from listings, search, static detail routes and sitemap", (model) => {
    expect(allProducts.some((product) => product.model === model)).toBe(false);
    expect(filterCatalogProducts(model)).toEqual([]);
    const slug = `lg-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    expect(generateStaticParams()).not.toContainEqual({ slug });
    expect(sitemap().some((entry) => entry.url.endsWith(`/products/${slug}/`))).toBe(false);
  });

  it.each(["lg-wt2520nhen", "lg-as60ghwg0", "lg-oled55c6psa", "lg-l257sfzw"])(
    "returns not-found for the removed product URL %s",
    async (slug) => {
      await expect(ProductDetailPage({ params: Promise.resolve({ slug }) })).rejects.toThrow();
    },
  );

  it("keeps the revised October prices and the TV bundle distinct from the standalone model", () => {
    const price = (model: string) => catalogProducts.find((product) => product.model === model)?.monthlyPrice;
    expect(price("OLED83C6PSA")).toBe(2699);
    expect(price("32U889.GRAB")).toBe(649);
    expect(price("OLED65C6PSA")).toBe(1299);
    expect(price("OLED65C6PSA.S80TY")).toBe(1299);
    expect(catalogProducts.find((product) => product.model === "OLED65C6PSA")?.promotionImage).not.toBe(
      catalogProducts.find((product) => product.model === "OLED65C6PSA.S80TY")?.promotionImage,
    );
  });
});
