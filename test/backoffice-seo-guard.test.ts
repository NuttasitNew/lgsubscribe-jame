import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listSourceFiles(path) : [path];
  });
}

describe("backoffice SEO boundary", () => {
  it("never exposes an internal route through sitemap", () => {
    expect(sitemap().some((entry) => new URL(entry.url).pathname.startsWith("/backoffice"))).toBe(false);
  });

  it("does not list the retired cancel-contract page", () => {
    expect(
      sitemap().some((entry) => new URL(entry.url).pathname.startsWith("/cancel-contract")),
    ).toBe(false);
  });

  it("does not list the retired price page", () => {
    expect(sitemap().some((entry) => new URL(entry.url).pathname.startsWith("/price"))).toBe(false);
  });

  it("does not list the retired authorized or payment-options pages", () => {
    expect(sitemap().some((entry) => new URL(entry.url).pathname.startsWith("/authorized"))).toBe(false);
    expect(sitemap().some((entry) => new URL(entry.url).pathname.startsWith("/payment-options"))).toBe(
      false,
    );
  });

  it("does not list the retired terms page", () => {
    expect(sitemap().some((entry) => new URL(entry.url).pathname.startsWith("/terms"))).toBe(false);
  });

  it("does not keep public website copy about contract cancellation", () => {
    const files = [
      ...listSourceFiles("app/(public)"),
      ...listSourceFiles("feature/public"),
      ...listSourceFiles("components"),
      "lib/site.ts",
      "lib/current-page-label.ts",
    ].filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/ยกเลิก|cancel-contract/);
    }
  });

  it("does not keep public website links to the retired price page", () => {
    const files = [
      ...listSourceFiles("app/(public)"),
      ...listSourceFiles("feature/public"),
      ...listSourceFiles("components"),
      "lib/site.ts",
      "lib/current-page-label.ts",
    ].filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/\/price\//);
    }
  });

  it("does not keep public website links to retired authorized or payment-options pages", () => {
    const files = [
      ...listSourceFiles("app/(public)"),
      ...listSourceFiles("feature/public"),
      ...listSourceFiles("components"),
      "lib/site.ts",
      "lib/current-page-label.ts",
    ].filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/\/authorized\//);
      expect(readFileSync(file, "utf8"), file).not.toMatch(/\/payment-options\//);
    }
  });

  it("does not keep public website links to the retired terms page", () => {
    const files = [
      ...listSourceFiles("app/(public)"),
      ...listSourceFiles("feature/public"),
      ...listSourceFiles("components"),
      "lib/site.ts",
      "lib/current-page-label.ts",
    ].filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/\/terms\//);
    }
  });

  it("blocks crawlers from the entire backoffice subtree", () => {
    const rules = robots().rules;
    const normalizedRules = Array.isArray(rules) ? rules : [rules];

    expect(normalizedRules.some((rule) => rule.disallow === "/backoffice/")).toBe(true);
  });
});
