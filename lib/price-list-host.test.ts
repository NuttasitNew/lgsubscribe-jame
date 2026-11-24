import { describe, expect, it } from "vitest";
import { decideHost, priceListHosts } from "./price-list-host";

const hosts = priceListHosts(" Price.Example.test , other.example.test ");

describe("price list hostname split", () => {
  it("parses the env list", () => {
    expect(hosts).toEqual(["price.example.test", "other.example.test"]);
    expect(priceListHosts(undefined)).toEqual([]);
  });
  it("keeps one host when not configured", () => {
    expect(decideHost("localhost:3000", "/price-list/", [])).toEqual({ action: "next" });
  });
  it("hides the price list on the public site", () => {
    expect(decideHost("www.main.test", "/price-list/", hosts)).toEqual({ action: "notFound" });
    expect(decideHost("www.main.test", "/api/price-list/login/", hosts)).toEqual({ action: "notFound" });
    expect(decideHost("www.main.test", "/products/", hosts)).toEqual({ action: "next" });
    expect(decideHost("www.main.test", "/price-listing/", hosts)).toEqual({ action: "next" });
  });
  it("serves only the price list on its own host", () => {
    expect(decideHost("price.example.test", "/", hosts)).toEqual({ action: "rewrite", pathname: "/price-list/" });
    expect(decideHost("PRICE.example.test:443", "/price-list/", hosts)).toEqual({ action: "next" });
    expect(decideHost("price.example.test", "/api/price-list/login/", hosts)).toEqual({ action: "next" });
    expect(decideHost("price.example.test", "/_next/static/x.js", hosts)).toEqual({ action: "next" });
    expect(decideHost("price.example.test", "/images/price-list/a.webp", hosts)).toEqual({ action: "next" });
    expect(decideHost("price.example.test", "/robots.txt", hosts)).toEqual({ action: "robots" });
    for (const path of ["/products/", "/backoffice/", "/sitemap.xml", "/manifest.webmanifest", "/api/leads/"]) {
      expect(decideHost("price.example.test", path, hosts)).toEqual({ action: "notFound" });
    }
  });
});
