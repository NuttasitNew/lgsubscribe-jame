import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("backoffice SEO boundary", () => {
  it("never exposes an internal route through sitemap", () => {
    expect(sitemap().some((entry) => new URL(entry.url).pathname.startsWith("/backoffice"))).toBe(false);
  });

  it("blocks crawlers from the entire backoffice subtree", () => {
    const rules = robots().rules;
    const normalizedRules = Array.isArray(rules) ? rules : [rules];

    expect(normalizedRules.some((rule) => rule.disallow === "/backoffice/")).toBe(true);
  });
});
