import "server-only";

import { readBackofficeSession } from "@/lib/backoffice/auth";
import { canAccess } from "@/lib/backoffice/permissions";

/**
 * Adapter for the SEO actions ported from hmp-frontend. They read the session cookie and
 * require `role === "SUPER_ADMIN"`; in lg-jame that role means the backoffice user holds
 * the `seo.manage` permission (owners always do).
 */
export async function verifyByToken(token: string) {
  const user = await readBackofficeSession(token);
  if (!user) throw new Error("invalid backoffice session");
  return {
    role: canAccess(user, "seo.manage") ? ("SUPER_ADMIN" as const) : ("NONE" as const),
    name: user.displayName || user.username,
    userId: user.id,
  };
}
