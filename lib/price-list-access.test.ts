import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => ({}) }));

describe("price list access token", () => {
  beforeAll(() => {
    process.env.BACKOFFICE_SESSION_SECRET = "x".repeat(40);
  });

  it("normalizes codes to lowercase and rejects odd input", async () => {
    const { normalizeCode } = await import("./price-list-access");
    expect(normalizeCode("  ABC123 ")).toBe("abc123");
    expect(normalizeCode("a b")).toBeNull();
    expect(normalizeCode("ab")).toBeNull();
    expect(normalizeCode(42)).toBeNull();
  });

  it("round-trips a signed cookie and rejects tampering or expiry", async () => {
    const { accessMaxAge, createAccessToken, parseAccessToken } = await import("./price-list-access");
    const now = Date.UTC(2026, 10, 25);
    const token = createAccessToken("abc123", now);
    expect(parseAccessToken(token, now)).toBe("abc123");
    expect(parseAccessToken(token.replace("abc123", "abc124"), now)).toBeNull();
    expect(parseAccessToken(`${token}0`, now)).toBeNull();
    expect(parseAccessToken(token, now + accessMaxAge * 1000 + 1)).toBeNull();
    expect(parseAccessToken(undefined, now)).toBeNull();
  });
});
