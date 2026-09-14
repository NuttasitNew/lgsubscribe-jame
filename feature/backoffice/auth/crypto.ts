import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? ""))
    return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export function signSession(secret: string, passwordHash: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ expires: now + 8 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${payload}:${passwordHash}`).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token: string, secret: string, passwordHash: string, now = Date.now()) {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return false;
    const expected = createHmac("sha256", secret).update(`${payload}:${passwordHash}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const { expires } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof expires === "number" && expires > now && expires <= now + 8 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}
