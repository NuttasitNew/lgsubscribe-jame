// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const cookie = vi.hoisted(() => vi.fn(async () => ({ get: () => undefined })));
vi.mock("next/headers", () => ({ cookies: cookie }));
import { hasBackofficeAccess, isLocalPreview } from "@/feature/backoffice/auth/session";
import { getPrisma } from "@/lib/db/prisma";
afterEach(() => vi.unstubAllEnvs());
describe("private access and database environment boundaries", () => {
  it("never enables the design bypass in production or on Vercel", async () => {
    vi.stubEnv("BACKOFFICE_DESIGN_PREVIEW", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BACKOFFICE_SESSION_SECRET", "");
    expect(isLocalPreview()).toBe(false);
    expect(await hasBackofficeAccess()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    expect(isLocalPreview()).toBe(false);
  });
  it("rejects development use of production and preview without development configuration", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_ENV", "production");
    expect(() => getPrisma()).toThrow("Development must not");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(() => getPrisma()).toThrow("Preview requires");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_ENV", "development");
    expect(() => getPrisma()).toThrow("Production requires");
  });
});
