import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const attempts = vi.hoisted(() => ({ upsert: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => ({ backofficeLoginAttempt: attempts }) }));
import { POST } from "@/app/api/backoffice/login/route";
import { POST as logout } from "@/app/api/backoffice/logout/route";

function request(data: unknown, origin = "https://site.test") {
  return new Request("https://site.test/api/backoffice/login/", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
}
beforeEach(() => {
  const salt = "ab".repeat(16);
  vi.stubEnv(
    "BACKOFFICE_PASSWORD_HASH",
    `scrypt:${salt}:${scryptSync("test-password", salt, 64).toString("hex")}`,
  );
  vi.stubEnv("BACKOFFICE_SESSION_SECRET", "x".repeat(64));
  vi.stubEnv("BACKOFFICE_USERNAME", "admin");
  vi.stubEnv("NODE_ENV", "production");
  attempts.upsert.mockResolvedValue({ attempts: 1 });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("login and logout handlers", () => {
  it("sets a Secure HttpOnly cookie only after valid login", async () => {
    const response = await POST(request({ username: "admin", password: "test-password" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(attempts.upsert.mock.calls[0][0].where.key).toMatch(/^[a-f0-9]{64}$/);
  });
  it("rejects wrong credentials, null bodies and cross-origin login", async () => {
    expect((await POST(request({ username: "admin", password: "wrong" }))).status).toBe(401);
    expect((await POST(request(null))).status).toBe(401);
    vi.clearAllMocks();
    expect((await POST(request({}, "https://other.test"))).status).toBe(403);
    expect(attempts.upsert).not.toHaveBeenCalled();
  });
  it("limits repeated attempts before validating a password", async () => {
    attempts.upsert.mockResolvedValue({ attempts: 11 });
    const response = await POST(request({ username: "admin", password: "test-password" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("clears session on logout and rejects cross-origin logout", async () => {
    const response = await logout(request({}));
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await logout(request({}, "https://other.test"))).status).toBe(403);
  });
});
