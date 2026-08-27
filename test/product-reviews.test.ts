import { describe, expect, it } from "vitest";
import { allProducts } from "@/lib/catalog-products";
import {
  MAX_PRODUCT_REVIEWS,
  REVIEW_AVERAGE_MAX,
  REVIEW_AVERAGE_MIN,
  REVIEW_RATE_MAX,
  REVIEW_RATE_MIN,
  getProductReviewAverage,
  getProductReviewCount,
  getProductReviewRate,
  getProductReviews,
} from "@/lib/product-reviews";
import { VIEW_EPOCH_MS, getProductOrdersAt } from "@/lib/product-views";

const NOW = Date.parse("2026-08-27T12:00:00+07:00");

describe("product reviews", () => {
  it("keeps each model's review count at 10-15% of its orders, capped so the page stays readable", () => {
    for (const product of allProducts) {
      const orders = getProductOrdersAt(product.model, NOW);
      const rate = getProductReviewRate(product.model);
      const reviews = getProductReviews(product, NOW);

      expect(rate).toBeGreaterThanOrEqual(REVIEW_RATE_MIN);
      expect(rate).toBeLessThanOrEqual(REVIEW_RATE_MAX);
      expect(reviews).toHaveLength(getProductReviewCount(product.model, orders));
      expect(reviews.length).toBe(Math.min(MAX_PRODUCT_REVIEWS, Math.round(orders * rate)));
    }
  });

  it("does not invent reviews before any orders exist", () => {
    const product = allProducts.find((item) => item.model === "WD516AN");
    expect(product).toBeDefined();
    expect(getProductReviews(product!, VIEW_EPOCH_MS)).toEqual([]);
  });

  it("lets popular models collect more reviews than niche models", () => {
    const water = allProducts.find((item) => item.model === "WD516AN")!;
    const monitor = allProducts.find((item) => item.model === "STAGE301")!;

    expect(getProductReviews(water, NOW).length).toBeGreaterThan(getProductReviews(monitor, NOW).length);
  });

  it("keeps spoken, product-specific user language instead of spec-sheet copy", () => {
    const saq = allProducts.find((item) => item.model === "SAQ13A")!;
    const siq = allProducts.find((item) => item.model === "SIQ11B")!;
    const water = allProducts.find((item) => item.model === "WD516AN")!;
    const catPurifier = allProducts.find((item) => item.model === "AS25GCBY0")!;
    const washTower = allProducts.find((item) => item.model === "WT1410NHEG")!;

    const saqText = reviewText(saq);
    const siqText = reviewText(siq);
    const waterText = reviewText(water);
    const catText = reviewText(catPurifier);
    const washText = reviewText(washTower);

    expect(saqText).toMatch(/เสียงเงียบ|เย็นไว|ห้าดาว|เบอร์ 5/);
    expect(siqText).not.toMatch(/ห้าดาว|5 ดาว/);
    expect(waterText).toMatch(/ต้มน้ำ|กดร้อน|กดเย็น/);
    expect(catText).toMatch(/แมว|กระบะทราย/);
    expect(washText).toMatch(/ไม่ต้องตากผ้า|ซักแล้วอบ|แผงปุ่มอยู่ตรงกลาง/);
    expect(new Set(getProductReviews(saq, NOW).map((review) => review.title)).size).toBe(
      getProductReviews(saq, NOW).length,
    );
  });

  it("does not attach duration, household, or city labels to any review", () => {
    for (const product of allProducts) {
      const reviews = getProductReviews(product, NOW);
      expect(reviews.every((review) => review.context === "")).toBe(true);
    }
  });

  it("keeps every product at 5-star reviews and a 4.8 or 4.9 average", () => {
    for (const product of allProducts) {
      const reviews = getProductReviews(product, NOW);
      const average = getProductReviewAverage(product.model);

      expect(reviews.every((review) => review.rating === 5)).toBe(true);
      expect(average).toBeGreaterThanOrEqual(REVIEW_AVERAGE_MIN);
      expect(average).toBeLessThanOrEqual(REVIEW_AVERAGE_MAX);
      expect(average.toFixed(1)).toMatch(/^4\.[89]$/);
    }

    const scores = allProducts.map((product) => getProductReviewAverage(product.model));
    expect(scores).toContain(4.8);
    expect(scores).toContain(4.9);
    expect(scores.every((score) => score < 5)).toBe(true);
  });

  it("uses real WashTower owner language instead of brochure copy", () => {
    const washTower = allProducts.find((item) => item.model === "WT1410NHEG")!;
    const titles = getProductReviews(washTower, NOW).map((review) => review.title);

    expect(titles.some((title) => /ไม่ต้องตากผ้า|ซักแล้วอบ|แผงปุ่มอยู่ตรงกลาง/.test(title))).toBe(true);
    expect(titles).not.toContain("ซักและอบจบ ไม่ต้องคอยดูฟ้าฝน");
  });

  it("keeps review summaries as spoken anecdotes, not one-line slogans", () => {
    for (const product of allProducts) {
      const reviews = getProductReviews(product, NOW);
      expect(reviews.every((review) => review.summary.length >= 50)).toBe(true);
    }
  });
});

function reviewText(product: (typeof allProducts)[number]) {
  return getProductReviews(product, NOW)
    .map((review) => `${review.title} ${review.summary} ${review.context}`)
    .join("\n");
}
