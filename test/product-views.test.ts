import { describe, expect, it } from "vitest";
import { catalogProducts } from "@/lib/catalog-products";
import {
  PRODUCT_PAGES_PER_SITE_VISIT,
  SITE_DAILY_VIEWS,
  VIEW_EPOCH_MS,
  expectedProductViewsAt,
  expectedSiteViewsAt,
  getProductDailyViews,
  getProductViewSnapshot,
  getProductViewWeight,
  getProductViewsAt,
  getSiteViewSnapshot,
  getSiteViewsAt,
  productViewWeights,
} from "@/lib/product-views";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("product view counters", () => {
  it("starts at zero on 1 Aug 2026 00:00 ICT", () => {
    expect(expectedSiteViewsAt(VIEW_EPOCH_MS)).toBe(0);
    expect(getSiteViewsAt(VIEW_EPOCH_MS)).toBe(0);
    expect(getProductViewsAt("WD516AN", VIEW_EPOCH_MS)).toBe(0);
  });

  it("does not count time before the epoch", () => {
    expect(getSiteViewsAt(VIEW_EPOCH_MS - HOUR)).toBe(0);
  });

  it("lands near 3,000 site visits on a typical 24-hour block, shaped by weekday", () => {
    const saturday = expectedSiteViewsAt(VIEW_EPOCH_MS + DAY);
    const monday =
      expectedSiteViewsAt(VIEW_EPOCH_MS + 3 * DAY) - expectedSiteViewsAt(VIEW_EPOCH_MS + 2 * DAY);

    expect(saturday).toBeCloseTo(SITE_DAILY_VIEWS * 0.84, 6);
    expect(monday).toBeCloseTo(SITE_DAILY_VIEWS * 1.02, 6);
  });

  it("moves faster in the Bangkok evening than at 03:00", () => {
    const nightStart = VIEW_EPOCH_MS + 3 * HOUR;
    const nightEnd = nightStart + HOUR;
    const eveningStart = VIEW_EPOCH_MS + 20 * HOUR;
    const eveningEnd = eveningStart + HOUR;

    const nightGain = expectedSiteViewsAt(nightEnd) - expectedSiteViewsAt(nightStart);
    const eveningGain = expectedSiteViewsAt(eveningEnd) - expectedSiteViewsAt(eveningStart);

    expect(eveningGain).toBeGreaterThan(nightGain * 8);
  });

  it("gives every catalog model its own predetermined daily rate", () => {
    expect(Object.keys(productViewWeights).sort()).toEqual(
      [...new Set(catalogProducts.map((product) => product.model))].sort(),
    );

    const dailyRates = catalogProducts.map((product) => getProductDailyViews(product.model));
    const uniqueRates = new Set(dailyRates.map((rate) => rate.toFixed(6)));

    expect(uniqueRates.size).toBe(catalogProducts.length);
    expect(dailyRates.reduce((total, rate) => total + rate, 0)).toBeCloseTo(
      SITE_DAILY_VIEWS * PRODUCT_PAGES_PER_SITE_VISIT,
      6,
    );
  });

  it("lets popular entry models collect more traffic than niche models, with overlap across products", () => {
    const now = VIEW_EPOCH_MS + 10 * DAY + 15 * HOUR;
    const water = getProductViewsAt("WD516AN", now);
    const monitor = getProductViewsAt("27GX790A-B", now);
    const site = getSiteViewsAt(now);
    const catalogTotal = catalogProducts.reduce(
      (total, product) => total + getProductViewsAt(product.model, now),
      0,
    );

    expect(water).toBeGreaterThan(monitor);
    expect(water).toBeGreaterThan(0);
    expect(site).toBeGreaterThan(water);
    expect(catalogTotal).toBeGreaterThan(site);
    expect(getProductViewWeight("WD516AN")).toBeGreaterThan(getProductViewWeight("27GX790A-B"));
  });

  it("keeps the same timestamp deterministic and never counts backwards", () => {
    const start = VIEW_EPOCH_MS + 5 * DAY + 19 * HOUR;
    let previousSite = 0;
    let previousProduct = 0;

    for (let step = 0; step <= 120; step += 1) {
      const now = start + step * 15_000;
      const site = getSiteViewsAt(now);
      const product = getProductViewsAt("SAQ13A", now);

      expect(getSiteViewsAt(now)).toBe(site);
      expect(site).toBeGreaterThanOrEqual(previousSite);
      expect(product).toBeGreaterThanOrEqual(previousProduct);
      previousSite = site;
      previousProduct = product;
    }
  });

  it("does not increment every product at the same instant", () => {
    const windowStart = VIEW_EPOCH_MS + 12 * DAY + 20 * HOUR;
    const windowEnd = windowStart + 3 * HOUR;
    const changed = catalogProducts.filter((product) => {
      const before = getProductViewsAt(product.model, windowStart);
      const after = getProductViewsAt(product.model, windowEnd);
      return after > before;
    });

    expect(changed.length).toBeGreaterThan(10);
    expect(
      getProductViewsAt("WD516AN", windowEnd) - getProductViewsAt("WD516AN", windowStart),
    ).toBeGreaterThan(getProductViewsAt("STAGE301", windowEnd) - getProductViewsAt("STAGE301", windowStart));
  });

  it("exposes a live current-viewer estimate that stays small and non-negative", () => {
    const peak = VIEW_EPOCH_MS + 8 * DAY + 20 * HOUR;
    const night = VIEW_EPOCH_MS + 8 * DAY + 3 * HOUR;
    const sitePeak = getSiteViewSnapshot(peak);
    const siteNight = getSiteViewSnapshot(night);
    const productPeak = getProductViewSnapshot("WD516AN", peak);

    expect(sitePeak.current).toBeGreaterThan(siteNight.current);
    expect(sitePeak.current).toBeLessThan(40);
    expect(productPeak.current).toBeLessThan(12);
    expect(siteNight.current).toBeGreaterThanOrEqual(0);
  });

  it("grows with elapsed time including hours and minutes", () => {
    const morning = VIEW_EPOCH_MS + 20 * DAY + 10 * HOUR;
    const laterSameMorning = morning + 25 * 60 * 1000;

    expect(expectedSiteViewsAt(laterSameMorning)).toBeGreaterThan(expectedSiteViewsAt(morning));
    expect(expectedProductViewsAt("S70TY", laterSameMorning)).toBeGreaterThan(
      expectedProductViewsAt("S70TY", morning),
    );
  });
});
