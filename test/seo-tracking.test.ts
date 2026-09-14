// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  parseKeyword,
  parsePeriod,
  defaultPeriod,
  previousPeriod,
} from "@/feature/backoffice/seo/validation";
import { parseGscCsv, parseCsv, csvCell } from "@/feature/backoffice/seo/csv";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/feature/backoffice/auth/crypto";

describe("SEO input and history boundaries", () => {
  it("normalizes duplicate keywords without changing the submitted display label", () => {
    const row = parseKeyword({ keyword: " LG  Subscribe ", targetPath: "/products", country: "THA" });
    expect(row).toMatchObject({
      keyword: "LG Subscribe",
      normalized: "lg subscribe",
      country: "tha",
      targetPath: "/products/",
    });
  });
  it.each([
    "https://evil.test/",
    "//evil.test/",
    "/backoffice/seo/",
    "/api/line/",
    "/products/../backoffice/",
    "/\\evil.test",
    "/products/?q=foo",
  ])("rejects non-public target %s", (targetPath) => {
    expect(() => parseKeyword({ keyword: "test", targetPath })).toThrow();
  });
  it("rejects invalid calendar dates, reversed or too-long periods", () => {
    expect(() => parsePeriod("2026-02-30", "2026-03-01")).toThrow();
    expect(() => parsePeriod("2026-01-02", "2026-01-01")).toThrow();
    expect(() => parsePeriod("2026-01-01", "2026-07-01")).toThrow();
  });
  it("uses Pacific dates and compares only a preceding non-overlapping equal-length period", () => {
    expect(defaultPeriod(new Date("2026-09-14T01:00:00Z"))).toEqual({
      start: "2026-08-14",
      end: "2026-09-10",
    });
    expect(previousPeriod(new Date("2026-08-14"), new Date("2026-09-10"))).toEqual({
      start: new Date("2026-07-17"),
      end: new Date("2026-08-13"),
    });
  });
});
describe("GSC CSV imports", () => {
  it("accepts quoted comma numbers, Thai headers, BOM and CRLF", () => {
    const rows = parseGscCsv(
      '\uFEFFข้อความค้นหายอดนิยม,การคลิก,การแสดงผล,CTR,อันดับ\r\nLG Subscribe,12,"1,200",1%,7.5\r\n',
    );
    expect(rows).toEqual([{ normalized: "lg subscribe", clicks: 12, impressions: 1200, position: 7.5 }]);
  });
  it("handles quoted field escapes and embedded newlines", () => {
    expect(parseCsv('a,b\n"a""b","line1\nline2"')).toEqual([
      ["a", "b"],
      ['a"b', "line1\nline2"],
    ]);
  });
  it.each([
    "Top queries,Clicks,Impressions,Position\na,1,10,",
    "Top queries,Clicks,Impressions,Position\na,1,10,0",
    "Top queries,Clicks,Impressions,Position\na,11,10,4",
    "Top queries,Clicks,Impressions,Position\na,0,0,0",
    "Top queries,Clicks,Impressions,Position\na,1,10,4\nA,1,10,4",
    'Top queries,Clicks,Impressions,Position\n"a,1,10,4',
  ])("rejects missing/invalid values or duplicate queries instead of inventing ranks", (csv) => {
    expect(() => parseGscCsv(csv)).toThrow();
  });
  it("neutralizes spreadsheet formulas on export", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
});
describe("backoffice authentication", () => {
  it("checks scrypt and rejects tampered, expired and password-rotated sessions", () => {
    const hash = hashPassword("test-password-long-enough");
    expect(verifyPassword("wrong", hash)).toBe(false);
    expect(verifyPassword("test-password-long-enough", hash)).toBe(true);
    const token = signSession("test-secret", hash, 1000);
    expect(verifySession(token, "test-secret", hash, 2000)).toBe(true);
    expect(verifySession(token + "tamper", "test-secret", hash, 2000)).toBe(false);
    expect(verifySession(token, "different-secret", hash, 2000)).toBe(false);
    expect(verifySession(token, "test-secret", hash + "changed", 2000)).toBe(false);
    expect(verifySession(token, "test-secret", hash, 1000 + 8 * 3600000)).toBe(false);
  });
});
