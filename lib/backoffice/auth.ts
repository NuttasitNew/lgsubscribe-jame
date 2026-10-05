import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getPrisma } from "@/lib/db/prisma";
import { canAccess, type Permission, type BackofficeIdentity } from "@/lib/backoffice/permissions";
import { redirect } from "next/navigation";

export const sessionCookie = "lg_backoffice_session";
export const sessionMaxAge = 24 * 60 * 60;

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

type SessionUser = BackofficeIdentity & { isActive: boolean; passwordHash: string; sessionVersion: number };
export function createUserSession(user: SessionUser, now = Date.now()) {
  const expires = now + sessionMaxAge * 1000;
  const payload = `v2.${user.id}.${expires}.${user.sessionVersion}`;
  return `${payload}.${digest(`${payload}:${user.passwordHash}`)}`;
}
export async function readBackofficeSession(
  token: string | undefined,
  now = Date.now(),
): Promise<BackofficeIdentity | null> {
  if (!token || (process.env.BACKOFFICE_SESSION_SECRET?.length ?? 0) < 32) return null;
  const prisma = getPrisma();
  let user: SessionUser | null;
  if (token.startsWith("v2.")) {
    const [version, id, expiry, revision, signature, extra] = token.split(".");
    if (
      extra ||
      !/^[a-f0-9-]{36}$/.test(id ?? "") ||
      !/^\d{13}$/.test(expiry ?? "") ||
      !/^\d{1,10}$/.test(revision ?? "") ||
      !/^[a-f0-9]{64}$/.test(signature ?? "")
    )
      return null;
    const expires = Number(expiry);
    if (expires <= now || expires > now + sessionMaxAge * 1000) return null;
    user = await prisma.backofficeUser.findUnique({ where: { id } });
    if (!user?.isActive || user.sessionVersion !== Number(revision)) return null;
    const payload = `${version}.${id}.${expiry}.${revision}`;
    if (
      !timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(digest(`${payload}:${user.passwordHash}`), "hex"),
      )
    )
      return null;
  } else {
    // Existing owner sessions survive migration, but never bypass database status/password.
    if (!validSession(token, now)) return null;
    user = await prisma.backofficeUser.findUnique({
      where: { username: process.env.BACKOFFICE_USERNAME ?? "admin" },
    });
    if (!user?.isOwner || !user.isActive || user.passwordHash !== process.env.BACKOFFICE_PASSWORD_HASH)
      return null;
  }
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    permissions: user.permissions,
    isOwner: user.isOwner,
  };
}
export const getBackofficeSession = cache(async () =>
  readBackofficeSession((await cookies()).get(sessionCookie)?.value),
);
export async function requireBackofficeSession(permission?: Permission) {
  const user = await getBackofficeSession();
  if (!user) redirect("/backoffice/auth/login/");
  if (permission && !canAccess(user, permission)) redirect("/backoffice/access-denied/");
  return user;
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
