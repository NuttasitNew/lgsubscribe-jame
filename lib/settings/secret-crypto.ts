import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Format: v1:<iv>:<auth tag>:<ciphertext>, base64url. The secret's name is bound as
// additional authenticated data, so a ciphertext copied onto another key fails to decrypt.
const VERSION = "v1";

/** SETTINGS_ENCRYPTION_KEY: 32 random bytes as 64 hex chars or base64 (`openssl rand -base64 32`). */
export function settingsEncryptionKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY must be 32 bytes (hex or base64)");
  return key;
}

function requireKey() {
  const key = settingsEncryptionKey();
  if (!key) throw new Error("SETTINGS_ENCRYPTION_KEY is not configured");
  return key;
}

export function encryptSecret(name: string, plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", requireKey(), iv);
  cipher.setAAD(Buffer.from(`integration-secret:${name}`));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(":");
}

export function decryptSecret(name: string, stored: string) {
  const [version, iv, tag, ciphertext] = stored.split(":");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined)
    throw new Error("Unknown secret format");
  const authTag = Buffer.from(tag, "base64url");
  // Refuse truncated tags: GCM would otherwise accept a shorter, forgeable tag.
  if (authTag.length !== 16) throw new Error("Invalid secret tag");
  const decipher = createDecipheriv("aes-256-gcm", requireKey(), Buffer.from(iv, "base64url"), {
    authTagLength: 16,
  });
  decipher.setAAD(Buffer.from(`integration-secret:${name}`));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString(
    "utf8",
  );
}
