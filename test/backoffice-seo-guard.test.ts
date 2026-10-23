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
  it("never exposes an internal route through sitemap", async () => {
    expect((await sitemap()).some((entry) => new URL(entry.url).pathname.startsWith("/backoffice"))).toBe(false);
  });

  it("does not list the retired cancel-contract page", async () => {
    expect(
      (await sitemap()).some((entry) => new URL(entry.url).pathname.startsWith("/cancel-contract")),
    ).toBe(false);
  });

  it("does not list the retired price page", async () => {
    expect((await sitemap()).some((entry) => new URL(entry.url).pathname.startsWith("/price"))).toBe(false);
  });

  it("lists the public authorized credibility page", async () => {
    expect((await sitemap()).some((entry) => new URL(entry.url).pathname === "/authorized/")).toBe(true);
  });

  it("does not list the retired payment-options page", async () => {
    expect((await sitemap()).some((entry) => new URL(entry.url).pathname.startsWith("/payment-options"))).toBe(
      false,
    );
  });

  it("does not list the retired terms page", async () => {
    expect((await sitemap()).some((entry) => new URL(entry.url).pathname.startsWith("/terms"))).toBe(false);
  });

  it("does not keep public website copy about contract cancellation", async () => {
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

  it("does not keep public website links to the retired price page", async () => {
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

  it("does not keep public website links to the retired payment-options page", async () => {
    const files = [
      ...listSourceFiles("app/(public)"),
      ...listSourceFiles("feature/public"),
      ...listSourceFiles("components"),
      "lib/site.ts",
      "lib/current-page-label.ts",
    ].filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/\/payment-options\//);
    }
  });

  it("does not keep public website links to the retired terms page", async () => {
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

  it("blocks crawlers from the entire backoffice subtree", async () => {
    const rules = robots().rules;
    const normalizedRules = Array.isArray(rules) ? rules : [rules];

    expect(normalizedRules.some((rule) => rule.disallow === "/backoffice/")).toBe(true);
  });
});
