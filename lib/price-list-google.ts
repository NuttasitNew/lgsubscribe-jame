import { randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { digest } from "@/lib/backoffice/auth";
import { accessMaxAge } from "@/lib/price-list-access";

/**
 * Staff sign in with their own Google account first, then enter a backoffice code, so every
 * visit has a name. The OAuth client belongs to the LG subscribe Google account; its id/secret
 * live in PRICE_LIST_GOOGLE_CLIENT_ID / PRICE_LIST_GOOGLE_CLIENT_SECRET. Unset = codes only.
 */
export const googleCookie = "lg_price_google";
export const oauthCookie = "lg_price_oauth";
export const oauthMaxAge = 10 * 60;

export type GoogleIdentity = { email: string; name: string | null };

export function googleEnabled() {
  return Boolean(process.env.PRICE_LIST_GOOGLE_CLIENT_ID && process.env.PRICE_LIST_GOOGLE_CLIENT_SECRET);
}

const encode = (value: GoogleIdentity) =>
  Buffer.from(JSON.stringify({ e: value.email, n: value.name })).toString("base64url");

export function createIdentityToken(identity: GoogleIdentity, now = Date.now()) {
  const payload = `g1.${encode(identity)}.${now + accessMaxAge * 1000}`;
  return `${payload}.${digest(`price-list-google:${payload}`)}`;
}

/** The Google account inside a valid, unexpired cookie, or null. */
export function parseIdentityToken(token: string | undefined, now = Date.now()): GoogleIdentity | null {
  if (!token) return null;
  const [version, body, expiry, signature, extra] = token.split(".");
  if (
    version !== "g1" ||
    extra ||
    !body ||
    !/^\d{13}$/.test(expiry ?? "") ||
    !/^[a-f0-9]{64}$/.test(signature ?? "")
  )
    return null;
  const expires = Number(expiry);
  if (expires <= now || expires > now + accessMaxAge * 1000) return null;
  let expected: string;
  try {
    expected = digest(`price-list-google:${version}.${body}.${expiry}`);
  } catch {
    return null;
  }
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) return null;
  try {
    const { e, n } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof e === "string" && e ? { email: e, name: typeof n === "string" && n ? n : null } : null;
  } catch {
    return null;
  }
}

/** Origin the browser used (the page runs on its own hostname behind Vercel). */
export function requestOrigin(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0] ?? new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

export const callbackPath = "/api/price-list/google/callback/";
/**
 * Google rejects http://price.localhost, so local dev registers http://localhost:3000
 * (PRICE_LIST_GOOGLE_REDIRECT_ORIGIN) and proxy.ts relays that callback back to the price host.
 */
export const redirectUri = (origin: string) =>
  `${process.env.PRICE_LIST_GOOGLE_REDIRECT_ORIGIN || origin}${callbackPath}`;

export function newOAuthState() {
  return { state: randomBytes(16).toString("hex"), nonce: randomBytes(16).toString("hex") };
}

export function authorizationUrl(origin: string, state: string, nonce: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.PRICE_LIST_GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** Swap the callback code for Google's signed id token and read the verified account from it. */
export async function exchangeCode(code: string, origin: string, nonce: string): Promise<GoogleIdentity> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.PRICE_LIST_GOOGLE_CLIENT_ID!,
      client_secret: process.env.PRICE_LIST_GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`);
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google returned no id token");
  const { payload } = await jwtVerify(idToken, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.PRICE_LIST_GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== nonce) throw new Error("Google nonce mismatch");
  if (typeof payload.email !== "string" || payload.email_verified !== true)
    throw new Error("Google email not verified");
  return {
    email: payload.email.toLowerCase().slice(0, 254),
    name: typeof payload.name === "string" ? payload.name.slice(0, 120) : null,
  };
}
