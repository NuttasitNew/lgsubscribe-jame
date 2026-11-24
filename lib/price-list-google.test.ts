import { beforeAll, describe, expect, it } from "vitest";
import { createIdentityToken, parseIdentityToken, redirectUri } from "./price-list-google";

beforeAll(() => {
  process.env.BACKOFFICE_SESSION_SECRET = "x".repeat(40);
});

describe("Google identity cookie", () => {
  it("round-trips the signed account", () => {
    const token = createIdentityToken({ email: "a.b@gmail.com", name: "สมชาย" });
    expect(parseIdentityToken(token)).toEqual({ email: "a.b@gmail.com", name: "สมชาย" });
  });
  it("rejects tampering and expiry", () => {
    const token = createIdentityToken({ email: "a@gmail.com", name: null });
    const [v, , e, s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "boss@gmail.com", n: null })).toString("base64url");
    expect(parseIdentityToken(`${v}.${forged}.${e}.${s}`)).toBeNull();
    expect(parseIdentityToken(token, Date.now() + 8 * 24 * 60 * 60 * 1000)).toBeNull();
    expect(parseIdentityToken(undefined)).toBeNull();
  });
  it("uses the dev relay origin for the callback when set", () => {
    delete process.env.PRICE_LIST_GOOGLE_REDIRECT_ORIGIN;
    expect(redirectUri("https://x.vercel.app")).toBe("https://x.vercel.app/api/price-list/google/callback/");
    process.env.PRICE_LIST_GOOGLE_REDIRECT_ORIGIN = "http://localhost:3000";
    expect(redirectUri("http://price.localhost:3000")).toBe("http://localhost:3000/api/price-list/google/callback/");
  });
});
