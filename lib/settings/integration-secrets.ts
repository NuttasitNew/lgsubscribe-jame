import { getPrisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret, settingsEncryptionKey } from "./secret-crypto";

export const integrationSecretDefs = {
  LINE_CHANNEL_SECRET: {
    label: "Channel secret",
    help: "LINE Developers > Basic settings > Channel secret (32 ตัวอักษร 0-9 a-f)",
    pattern: /^[0-9a-f]{32}$/i,
  },
  LINE_CHANNEL_ACCESS_TOKEN: {
    label: "Channel access token (long-lived)",
    help: "LINE Developers > Messaging API > Channel access token",
    pattern: /^[A-Za-z0-9+/=._-]{20,1024}$/,
  },
} as const;
export type IntegrationSecretKey = keyof typeof integrationSecretDefs;
export const integrationSecretKeys = Object.keys(integrationSecretDefs) as IntegrationSecretKey[];

export function isIntegrationSecretKey(value: unknown): value is IntegrationSecretKey {
  return typeof value === "string" && value in integrationSecretDefs;
}

// Webhooks read these on every request. One query loads all secrets and the decrypted
// values stay in this server instance's memory for CACHE_TTL_MS, so Neon sees at most one
// read per instance per TTL. Concurrent misses share one in-flight query. Saving clears
// this instance at once; other instances pick the change up when their TTL ends.
export const CACHE_TTL_MS = 5 * 60_000;
type Loaded = Partial<Record<IntegrationSecretKey, string>>;
let cache: { values: Loaded; expiresAt: number } | null = null;
let inFlight: Promise<Loaded> | null = null;

async function loadAll(): Promise<Loaded> {
  const rows = await getPrisma().integrationSecret.findMany({
    where: { key: { in: integrationSecretKeys } },
    select: { key: true, ciphertext: true },
  });
  const values: Loaded = {};
  for (const row of rows) {
    if (!isIntegrationSecretKey(row.key)) continue;
    try {
      values[row.key] = decryptSecret(row.key, row.ciphertext);
    } catch (error) {
      // Wrong/rotated key or tampered row: fall back to the environment value rather than crash.
      console.error("Integration secret could not be decrypted", {
        key: row.key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return values;
}

async function cachedValues(now = Date.now()): Promise<Loaded> {
  if (cache && cache.expiresAt > now) return cache.values;
  inFlight ??= loadAll()
    .then((values) => {
      cache = { values, expiresAt: Date.now() + CACHE_TTL_MS };
      return values;
    })
    .catch((error) => {
      console.error("Integration secrets could not be loaded", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Serve the last known values through a database outage; retry after a short pause.
      const values = cache?.values ?? {};
      cache = { values, expiresAt: Date.now() + 30_000 };
      return values;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Database value first, then the legacy environment variable of the same name. */
export async function getIntegrationSecret(key: IntegrationSecretKey) {
  const values = await cachedValues();
  return values[key] ?? (process.env[key]?.trim() || undefined);
}

export function clearIntegrationSecretCache() {
  cache = null;
}

export class SecretInputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function saveIntegrationSecret(
  actor: { id: string; displayName: string },
  key: IntegrationSecretKey,
  value: string | null,
) {
  const prisma = getPrisma();
  if (value === null) {
    await prisma.$transaction([
      prisma.integrationSecret.deleteMany({ where: { key } }),
      prisma.integrationSecretAudit.create({ data: { key, action: "clear", actorId: actor.id } }),
    ]);
  } else {
    if (!settingsEncryptionKey())
      throw new SecretInputError(
        "ยังไม่ได้ตั้งค่า SETTINGS_ENCRYPTION_KEY บนเซิร์ฟเวอร์ จึงบันทึกค่าลับไม่ได้",
        503,
      );
    if (!integrationSecretDefs[key].pattern.test(value))
      throw new SecretInputError(`รูปแบบ ${integrationSecretDefs[key].label} ไม่ถูกต้อง`);
    const data = {
      ciphertext: encryptSecret(key, value),
      last4: value.slice(-4),
      updatedById: actor.id,
      updatedByName: actor.displayName,
    };
    await prisma.$transaction([
      prisma.integrationSecret.upsert({ where: { key }, create: { key, ...data }, update: data }),
      prisma.integrationSecretAudit.create({ data: { key, action: "set", actorId: actor.id } }),
    ]);
  }
  clearIntegrationSecretCache();
}

/** Status for the settings page. Never returns plaintext. */
export async function listIntegrationSecretStatus() {
  const rows = await getPrisma().integrationSecret.findMany({
    where: { key: { in: integrationSecretKeys } },
    select: { key: true, last4: true, updatedAt: true, updatedByName: true },
  });
  return integrationSecretKeys.map((key) => {
    const row = rows.find((item) => item.key === key);
    return {
      key,
      label: integrationSecretDefs[key].label,
      help: integrationSecretDefs[key].help,
      source: row ? ("database" as const) : process.env[key]?.trim() ? ("env" as const) : ("none" as const),
      last4: row?.last4 ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedByName: row?.updatedByName ?? null,
    };
  });
}
