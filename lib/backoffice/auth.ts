import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const sessionCookie = "lg_backoffice_session";
export const sessionMaxAge = 8 * 60 * 60;

export function authConfigured() {
  return (
    /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.BACKOFFICE_PASSWORD_HASH ?? "") &&
    (process.env.BACKOFFICE_SESSION_SECRET?.length ?? 0) >= 32
  );
}

export function digest(value: string) {
  const secret = process.env.BACKOFFICE_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Backoffice secret is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function passwordMatches(username: string, password: string) {
  if (!authConfigured() || password.length > 256) return false;
  const [, salt, hash] = process.env.BACKOFFICE_PASSWORD_HASH!.split(":");
  const result = scryptSync(password, salt, 64);
  const valid = timingSafeEqual(result, Buffer.from(hash, "hex"));
  return valid && username === (process.env.BACKOFFICE_USERNAME ?? "admin");
}

export function createSession(now = Date.now()) {
  const expiry = String(now + sessionMaxAge * 1000);
  return `${expiry}.${digest(`session:${expiry}:${process.env.BACKOFFICE_PASSWORD_HASH}`)}`;
}

export function validSession(token: string | undefined, now = Date.now()) {
  if (!authConfigured() || !token) return false;
  const [expiry, signature, extra] = token.split(".");
  if (extra || !/^\d{13}$/.test(expiry) || !/^[a-f0-9]{64}$/.test(signature ?? "")) return false;
  const expires = Number(expiry);
  if (expires <= now || expires > now + sessionMaxAge * 1000) return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(digest(`session:${expiry}:${process.env.BACKOFFICE_PASSWORD_HASH}`), "hex"),
  );
}

export async function requireBackofficeSession() {
  if (!validSession((await cookies()).get(sessionCookie)?.value)) redirect("/backoffice/auth/login/");
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
