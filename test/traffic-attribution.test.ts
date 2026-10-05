import { describe, expect, it } from "vitest";
import { attributionFromUrl, normalizeAttribution, contactMethodForLink } from "@/lib/analytics/attribution";

describe("traffic attribution", () => {
  it("recognizes Ads click IDs ahead of UTM without inventing a Google Ads network", () => {
    const result = attributionFromUrl(
      "https://site.test/?gclid=abc123&utm_source=facebook&utm_campaign=october",
      "https://google.com/search?q=private",
    );
    expect(result).toMatchObject({
      source: "google",
      medium: "cpc",
      channel: "google_ads",
      attributionMethod: "click_id",
      campaign: "october",
      referrerHost: "google.com",
    });
    expect(normalizeAttribution({ ...result, clickId: null })).toMatchObject({
      source: "google",
      channel: "google_ads",
      clickId: null,
    });
  });
  it("distinguishes UTM, social, search, AI, referral and direct signals", () => {
    expect(
      attributionFromUrl("https://site.test/?utm_source=Facebook&utm_medium=paid_social", "").channel,
    ).toBe("paid_social");
    for (const [referrer, channel] of [
      ["https://www.google.co.th/search", "organic_search"],
      ["https://l.facebook.com/", "social"],
      ["https://chatgpt.com/", "ai_assistant"],
      ["https://example.com/sensitive?phone=123", "referral"],
      ["", "direct"],
      ["https://site.test/products/", "direct"],
    ])
      expect(attributionFromUrl("https://site.test/", referrer).channel).toBe(channel);
  });
  it("drops private URLs and does not trust client classification", () => {
    expect(
      normalizeAttribution({
        source: "name@example.com",
        campaign: "private@example.com",
        referrerHost: "example.com/private?phone=123",
        channel: "google_ads",
      }),
    ).toMatchObject({ source: "(direct)", campaign: null, referrerHost: null, channel: "direct" });
    expect(contactMethodForLink("tel:+6620575757")).toBeNull();
    expect(contactMethodForLink("https://line.me/R/ti/p/%40lgsubscribe")).toBe("line");
  });
});
