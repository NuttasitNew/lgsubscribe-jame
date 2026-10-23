/** @logic Separate Ads/organic windows and weight spelling variants by actual impressions. @related helper/aggregate-seo-search-demand.ts */
import { describe, expect, it } from "vitest";
import { aggregateSeoSearchDemand } from "@/lib/seo/helper/aggregate-seo-search-demand";
describe("aggregateSeoSearchDemand", () => {
  it("merges Thai variants without adding Ads counts to organic", () => {
    expect(
      aggregateSeoSearchDemand(
        [{ keyword: "ซัก โซฟา", impressions: 1000 }],
        [
          { query: "ซักโซฟา", impressions: 90, position: 5 },
          { query: "ซัก โซฟา", impressions: 10, position: 25 },
        ],
        new Set(["ซักโซฟา"])
      )
    ).toEqual([{ keyword: "ซักโซฟา", impressions: 100, adImpressions: 1000, organicPosition: 7, hasArticle: true }]); // (90*5 + 10*25)/100 = 7
  });
  it("zero impressions cannot manufacture a position", () => {
    expect(
      aggregateSeoSearchDemand([], [{ query: "test", impressions: 0, position: 99 }], new Set())[0].organicPosition
    ).toBeNull();
  });
  it("handles empty and whitespace-only input", () =>
    expect(aggregateSeoSearchDemand([{ keyword: " ", impressions: 10 }], [], new Set())).toEqual([]));
});
