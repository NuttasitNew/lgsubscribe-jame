import { describe, expect, it } from "vitest";
import { catalogProducts } from "@/lib/catalog-products";
import { getSubscriptionStartingPrice, subscriptionStartingPrices } from "@/lib/subscription-starting-prices";

describe("subscription starting prices", () => {
  it("uses the cheapest first-bill or package price from the August workbook", () => {
    expect(getSubscriptionStartingPrice("WD516AN")).toBe(149);
    expect(getSubscriptionStartingPrice("WD518AN")).toBe(149);
    expect(getSubscriptionStartingPrice("SAQ13A")).toBe(849);
    expect(getSubscriptionStartingPrice("AS10GDBY0")).toBe(1099);
    expect(getSubscriptionStartingPrice("GRAB")).toBe(109);
    expect(getSubscriptionStartingPrice("DFC533FV")).toBe(599);
  });

  it("copies those starting prices onto matching catalog cards", () => {
    for (const [model, price] of Object.entries(subscriptionStartingPrices)) {
      const product = catalogProducts.find((item) => item.model === model);
      if (!product) continue;
      expect(product.monthlyPrice).toBe(price);
    }
  });

  it("falls back to the campaign starting price when the exact SKU is not in the workbook", () => {
    expect(getSubscriptionStartingPrice("UNKNOWN-SKU")).toBeNull();
    expect(getSubscriptionStartingPrice("UNKNOWN-SKU", "เครื่องปรับอากาศ")).toBe(149);
    expect(getSubscriptionStartingPrice("UNKNOWN-SKU", "จอมอนิเตอร์")).toBe(399);
  });

  it("gives every catalog card a starting monthly price", () => {
    const missing = catalogProducts
      .filter((product) => product.monthlyPrice === null)
      .map((product) => product.model);
    expect(missing).toEqual([]);
  });
});
