import { describe, expect, it, vi } from "vitest";
import { allProducts, catalogProducts } from "@/lib/catalog-products";
import { filterCatalogProducts } from "@/lib/catalog-search";
import { novSubscriptionCampaignProducts } from "@/lib/nov-subscription-campaign";
import { promotionImageAssets } from "@/lib/promotion-image-assets";
import ProductDetailPage, {
  generateStaticParams,
} from "@/feature/public/products/components/product-detail-page";
import sitemap from "@/app/sitemap";

vi.mock("@/feature/backoffice/seo/seo-article/server/public-blog-article.helper", () => ({
  listPublishedBlogArticlesForCachedPage: async () => [],
}));

// Absent from the November price list, or listed as Control Stock (A9T-CORE).
const removedModels = [
  "A9T-ULTRA",
  "A9T-CORE",
  "B48FPGAM",
  "GN-F452PQAK",
  "GN-V389FQEF",
  "WT1410NHEN",
  "FV1413S4M",
  "S3MFC",
  "DD23GMWE1S",
  "27LX6TDGA.GRAB",
  "OLED65C6PSA.S80TY",
  "OLED77C6PSA.S80TY",
];

const addedModels = [
  "B52APGAM",
  "FX2725SFXKA",
  "FV1413S2BA",
  "RX10VHP3KR",
  "MD19GQGA1",
  "MD19GQGA1S",
  "75QNED86BSA",
  "27GX704A-B",
  "STAGE501",
  "OLED55C6PSA",
  "100MRGB96BS",
];

describe("November sales catalog", () => {
  it("publishes the reviewed 66 artworks for 67 products, sharing the water-purifier artwork", () => {
    expect(novSubscriptionCampaignProducts).toHaveLength(66);
    expect(promotionImageAssets).toHaveLength(66);
    expect(catalogProducts).toHaveLength(67);
    expect(allProducts.every((product) => product.promotionImage?.includes("/nov-2026/"))).toBe(true);
  });

  it.each(addedModels)("lists %s with its November artwork", (model) => {
    const product = catalogProducts.find((item) => item.model === model);
    expect(product?.promotionImage).toMatch(/\/nov-2026\//);
    expect(filterCatalogProducts(model).some((item) => item.model === model)).toBe(true);
  });

  it.each(removedModels)("removes %s from listings, search, static detail routes and sitemap", async (model) => {
    expect(allProducts.some((product) => product.model === model)).toBe(false);
    expect(filterCatalogProducts(model)).toEqual([]);
    const slug = `lg-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    expect(generateStaticParams()).not.toContainEqual({ slug });
    expect((await sitemap()).some((entry) => entry.url.endsWith(`/products/${slug}/`))).toBe(false);
  });

  it.each(["lg-a9t-ultra", "lg-s3mfc", "lg-wt1410nhen"])(
    "returns not-found for the removed product URL %s",
    async (slug) => {
      await expect(ProductDetailPage({ params: Promise.resolve({ slug }) })).rejects.toThrow();
    },
  );

  it("keeps the November prices and the dehumidifier bundle distinct from the standalone model", () => {
    const price = (model: string) => catalogProducts.find((product) => product.model === model)?.monthlyPrice;
    expect(price("OLED55C6PSA")).toBe(1099);
    expect(price("75QNED86BSA")).toBe(999);
    expect(price("STAGE501")).toBe(449);
    expect(price("MD19GQGA1S")).toBe(399);
    expect(catalogProducts.find((product) => product.model === "MD19GQGA1")?.promotionImage).not.toBe(
      catalogProducts.find((product) => product.model === "MD19GQGA1S")?.promotionImage,
    );
  });
});
