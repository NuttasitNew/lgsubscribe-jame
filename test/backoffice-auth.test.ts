import { scryptSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession, passwordMatches, validSession } from "@/lib/backoffice/auth";

afterEach(() => vi.unstubAllEnvs());
function setup() {
  const salt = "ab".repeat(16);
  vi.stubEnv(
    "BACKOFFICE_PASSWORD_HASH",
    `scrypt:${salt}:${scryptSync("correct-password", salt, 64).toString("hex")}`,
  );
  vi.stubEnv("BACKOFFICE_SESSION_SECRET", "secret".repeat(8));
  vi.stubEnv("BACKOFFICE_USERNAME", "admin");
}
describe("backoffice session boundary", () => {
  it("validates username and hashed password", () => {
    setup();
    expect(passwordMatches("admin", "correct-password")).toBe(true);
    expect(passwordMatches("other", "correct-password")).toBe(false);
    expect(passwordMatches("admin", "wrong")).toBe(false);
  });
  it("rejects tampered, expired and malformed tokens", () => {
    setup();
    const now = Date.now();
    const token = createSession(now);
    expect(validSession(token, now)).toBe(true);
    expect(validSession(token, now + 8 * 3600000)).toBe(true);
    expect(validSession(token, now + 24 * 3600000 - 1)).toBe(true);
    expect(validSession(token, now + 24 * 3600000)).toBe(false);
    expect(validSession(token + "0", now)).toBe(false);
    expect(validSession("garbage", now)).toBe(false);
    expect(validSession(undefined, now)).toBe(false);
  });
  it("invalidates sessions after credentials change and denies unconfigured auth", () => {
    setup();
    const token = createSession();
    vi.stubEnv("BACKOFFICE_PASSWORD_HASH", "");
    expect(validSession(token)).toBe(false);
    expect(passwordMatches("admin", "correct-password")).toBe(false);
    setup();
    vi.stubEnv("BACKOFFICE_SESSION_SECRET", "different".repeat(8));
    expect(validSession(token)).toBe(false);
  });
});
