// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/settings/secret-crypto";
import {
  CACHE_TTL_MS,
  clearIntegrationSecretCache,
  getIntegrationSecret,
  listIntegrationSecretStatus,
  saveIntegrationSecret,
} from "@/lib/settings/integration-secrets";

const KEY = "a".repeat(64);
const db = vi.hoisted(() => ({
  rows: [] as Array<{
    key: string;
    ciphertext: string;
    last4: string;
    updatedAt: Date;
    updatedByName: string;
  }>,
  reads: 0,
  fail: false,
  audits: [] as unknown[],
}));
vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    integrationSecret: {
      findMany: async () => {
        db.reads++;
        if (db.fail) throw new Error("neon down");
        return db.rows;
      },
      upsert: (args: { create: (typeof db.rows)[number] }) => ({ op: "upsert", args }),
      deleteMany: (args: { where: { key: string } }) => ({ op: "delete", args }),
    },
    integrationSecretAudit: { create: (args: unknown) => ({ op: "audit", args }) },
    $transaction: async (ops: Array<{ op: string; args: never }>) => {
      for (const { op, args } of ops) {
        const a = args as { create: (typeof db.rows)[number]; where: { key: string } };
        if (op === "upsert")
          db.rows = [
            ...db.rows.filter((r) => r.key !== a.create.key),
            { ...a.create, updatedAt: new Date(), updatedByName: "Owner" },
          ];
        if (op === "delete") db.rows = db.rows.filter((r) => r.key !== a.where.key);
        if (op === "audit") db.audits.push(args);
      }
    },
  }),
}));

const actor = { id: "00000000-0000-0000-0000-000000000001", displayName: "Owner" };
const secret = "0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.stubEnv("SETTINGS_ENCRYPTION_KEY", KEY);
  db.rows = [];
  db.reads = 0;
  db.fail = false;
  db.audits = [];
  clearIntegrationSecretCache();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("secret-crypto", () => {
  it("round-trips and binds the ciphertext to its key name", () => {
    const stored = encryptSecret("LINE_CHANNEL_SECRET", secret);
    expect(stored).not.toContain(secret);
    expect(decryptSecret("LINE_CHANNEL_SECRET", stored)).toBe(secret);
    expect(() => decryptSecret("LINE_CHANNEL_ACCESS_TOKEN", stored)).toThrow();
  });
  it("rejects tampering and a different key", () => {
    const stored = encryptSecret("LINE_CHANNEL_SECRET", secret);
    const parts = stored.split(":");
    parts[3] = Buffer.from("x".repeat(32)).toString("base64url");
    expect(() => decryptSecret("LINE_CHANNEL_SECRET", parts.join(":"))).toThrow();
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "b".repeat(64));
    expect(() => decryptSecret("LINE_CHANNEL_SECRET", stored)).toThrow();
  });
});

describe("integration secrets store", () => {
  it("saves encrypted, exposes only the last 4 characters and writes an audit row", async () => {
    await saveIntegrationSecret(actor, "LINE_CHANNEL_SECRET", secret);
    expect(db.rows[0].ciphertext).not.toContain(secret);
    expect(db.audits).toHaveLength(1);
    const status = await listIntegrationSecretStatus();
    expect(status[0]).toMatchObject({ key: "LINE_CHANNEL_SECRET", source: "database", last4: "cdef" });
    expect(JSON.stringify(status)).not.toContain(secret);
  });

  it("rejects malformed values and saving without an encryption key", async () => {
    await expect(saveIntegrationSecret(actor, "LINE_CHANNEL_SECRET", "nope")).rejects.toThrow("รูปแบบ");
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "");
    await expect(saveIntegrationSecret(actor, "LINE_CHANNEL_SECRET", secret)).rejects.toThrow(
      "SETTINGS_ENCRYPTION_KEY",
    );
  });

  it("caches reads for the TTL and shares one query between concurrent callers", async () => {
    vi.useFakeTimers();
    await saveIntegrationSecret(actor, "LINE_CHANNEL_SECRET", secret);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => getIntegrationSecret("LINE_CHANNEL_SECRET")),
    );
    expect(new Set(results)).toEqual(new Set([secret]));
    await getIntegrationSecret("LINE_CHANNEL_ACCESS_TOKEN");
    expect(db.reads).toBe(1);
    vi.advanceTimersByTime(CACHE_TTL_MS + 1);
    await getIntegrationSecret("LINE_CHANNEL_SECRET");
    expect(db.reads).toBe(2);
  });

  it("clears the cache on save so the new value applies at once on this instance", async () => {
    await getIntegrationSecret("LINE_CHANNEL_SECRET");
    await saveIntegrationSecret(actor, "LINE_CHANNEL_SECRET", secret);
    await expect(getIntegrationSecret("LINE_CHANNEL_SECRET")).resolves.toBe(secret);
  });

  it("falls back to the environment variable, and keeps the last value during a database outage", async () => {
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "env-token-value-1234567890");
    await expect(getIntegrationSecret("LINE_CHANNEL_ACCESS_TOKEN")).resolves.toBe(
      "env-token-value-1234567890",
    );
    await saveIntegrationSecret(actor, "LINE_CHANNEL_SECRET", secret);
    await getIntegrationSecret("LINE_CHANNEL_SECRET");
    vi.useFakeTimers();
    vi.advanceTimersByTime(CACHE_TTL_MS + 1);
    db.fail = true;
    await expect(getIntegrationSecret("LINE_CHANNEL_SECRET")).resolves.toBe(secret);
  });
});
