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

describe("price list sign-in device details", () => {
  it("keeps only known device fields and clips them", async () => {
    const { parseDevice, normalizeDeviceId } = await import("./price-list-access");
    expect(
      parseDevice({ screen: "390x844", dpr: 3, model: "SM-A546E", evil: "x", lang: "th".repeat(50) }),
    ).toEqual({ screen: "390x844", dpr: 3, model: "SM-A546E", lang: "th".repeat(10) });
    expect(parseDevice(["x"])).toBeNull();
    expect(parseDevice({})).toBeNull();
    expect(normalizeDeviceId("abcd1234-ef")).toBe("abcd1234-ef");
    expect(normalizeDeviceId("<script>")).toBeNull();
  });
  it("reads the caller IP and Vercel's approximate place", async () => {
    const { requestPlace } = await import("./price-list-access");
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.9",
      "x-forwarded-for": "10.0.0.1, 203.0.113.9",
      "x-vercel-ip-city": "Bang%20Kapi",
      "x-vercel-ip-country-region": "10",
      "x-vercel-ip-country": "TH",
    });
    expect(requestPlace(headers)).toEqual({
      ip: "203.0.113.9",
      city: "Bang Kapi",
      region: "10",
      country: "TH",
    });
    expect(requestPlace(new Headers())).toEqual({ ip: null, city: null, region: null, country: null });
  });
  it("describes common staff devices in one line", async () => {
    const { describeDevice } = await import("./price-list-access");
    expect(
      describeDevice(
        "Mozilla/5.0 (Linux; Android 15; SM-A546E Build/AP3A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Android 15 · Chrome 131 · SM-A546E");
    expect(
      describeDevice(
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Pixel 8",
      ),
    ).toBe("Android 10 · Chrome 131 · Pixel 8");
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iOS 18.1 · Safari 18 · iPhone");
    expect(describeDevice(null)).toBe("-");
  });
});
