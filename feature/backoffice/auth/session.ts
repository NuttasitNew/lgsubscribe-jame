import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifySession } from "./crypto";

export const sessionCookie = "lg_backoffice";
export function isLocalPreview() {
  return (
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL &&
    process.env.BACKOFFICE_DESIGN_PREVIEW === "true"
  );
}
export function authConfigured() {
  return (
    (process.env.BACKOFFICE_SESSION_SECRET?.length ?? 0) >= 32 &&
    /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.BACKOFFICE_PASSWORD_HASH ?? "")
  );
}
export async function hasBackofficeAccess() {
  if (isLocalPreview()) return true;
  if (!authConfigured()) return false;
  const token = (await cookies()).get(sessionCookie)?.value;
  return (
    !!token &&
    verifySession(token, process.env.BACKOFFICE_SESSION_SECRET!, process.env.BACKOFFICE_PASSWORD_HASH!)
  );
}
export async function requireBackofficeAccess() {
  if (!authConfigured() && !isLocalPreview()) notFound();
  if (!(await hasBackofficeAccess())) redirect("/backoffice/auth/login/");
}
