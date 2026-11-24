import { timingSafeEqual } from "node:crypto";
import { digest } from "@/lib/backoffice/auth";
import { getPrisma } from "@/lib/db/prisma";

/** Staff price list gate: any active code from the backoffice opens /price-list/. */
export const accessCookie = "lg_price_list_access";
export const accessMaxAge = 7 * 24 * 60 * 60;

/** Codes are case-insensitive and stored lowercase (e.g. "abc123"). */
export function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  return /^[a-z0-9_-]{3,32}$/.test(code) ? code : null;
}

export function createAccessToken(code: string, now = Date.now()) {
  const payload = `pl1.${code}.${now + accessMaxAge * 1000}`;
  return `${payload}.${digest(`price-list:${payload}`)}`;
}

/** The code inside a valid, unexpired cookie (signature only; the caller checks it is still active). */
export function parseAccessToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [version, code, expiry, signature, extra] = token.split(".");
  if (version !== "pl1" || extra || !normalizeCode(code) || !/^\d{13}$/.test(expiry ?? "")) return null;
  if (!/^[a-f0-9]{64}$/.test(signature ?? "")) return null;
  const expires = Number(expiry);
  if (expires <= now || expires > now + accessMaxAge * 1000) return null;
  let expected: string;
  try {
    expected = digest(`price-list:${version}.${code}.${expiry}`);
  } catch {
    return null;
  }
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")) ? code : null;
}

/** Signed cookie whose code is still active in the backoffice, or null. */
export async function readAccessCode(token: string | undefined) {
  const code = parseAccessToken(token);
  if (!code) return null;
  const row = await getPrisma().priceListAccessCode.findUnique({ where: { code } });
  return row?.isActive ? code : null;
}

export async function logAccess(code: string, kind: "login" | "view", userAgent: string | null) {
  await getPrisma().priceListAccessLog.create({
    data: { code, kind, userAgent: userAgent?.slice(0, 300) ?? null },
  });
}
