import { timingSafeEqual } from "node:crypto";
import { digest } from "@/lib/backoffice/auth";
import type { Prisma } from "@prisma/client";
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

/** Long-lived cookie with the browser's random device id, so page opens are tied to the device too. */
export const deviceCookie = "lg_price_device";
export const deviceMaxAge = 400 * 24 * 60 * 60;

export function normalizeDeviceId(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,40}$/.test(value) ? value : null;
}

const clip = (value: unknown, max = 60) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** Whitelisted device details from the sign-in form; anything else is dropped. */
export function parseDevice(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const device = {
    screen: clip(d.screen, 20),
    dpr: num(d.dpr),
    lang: clip(d.lang, 20),
    tz: clip(d.tz, 40),
    touch: num(d.touch),
    model: clip(d.model),
    platform: clip(d.platform, 30),
    platformVersion: clip(d.platformVersion, 30),
  };
  const kept = Object.fromEntries(Object.entries(device).filter(([, v]) => v !== undefined));
  return Object.keys(kept).length ? kept : null;
}

/** Caller IP and Vercel's approximate place for it (headers are absent in local dev). */
export function requestPlace(headers: Headers) {
  const header = (name: string) => headers.get(name)?.trim() || null;
  const ip = (header("x-vercel-forwarded-for") ?? header("x-forwarded-for"))?.split(",")[0]?.trim() || null;
  let city = header("x-vercel-ip-city");
  try {
    city = city ? decodeURIComponent(city) : null;
  } catch {
    /* keep the raw value */
  }
  return {
    ip: ip?.slice(0, 64) ?? null,
    city: city?.slice(0, 80) ?? null,
    region: header("x-vercel-ip-country-region")?.slice(0, 16) ?? null,
    country: header("x-vercel-ip-country")?.slice(0, 8) ?? null,
  };
}

export async function logAccess(
  code: string,
  kind: "login" | "view",
  headers: Headers,
  {
    deviceId = null,
    device = null,
    identity = null,
  }: {
    deviceId?: string | null;
    device?: Record<string, unknown> | null;
    identity?: { email: string; name: string | null } | null;
  } = {},
) {
  await getPrisma().priceListAccessLog.create({
    data: {
      code,
      kind,
      userAgent: headers.get("user-agent")?.slice(0, 300) ?? null,
      deviceId,
      ...requestPlace(headers),
      email: identity?.email ?? null,
      googleName: identity?.name ?? null,
      ...(device ? { device: device as Prisma.InputJsonObject } : {}),
    },
  });
}

/** "Android 15 · Chrome 131 · SM-A546E" from a user agent (+ the model the form reported). */
export function describeDevice(userAgent: string | null, model?: unknown) {
  const ua = userAgent ?? "";
  const first = (...patterns: [RegExp, (m: RegExpMatchArray) => string][]) => {
    for (const [pattern, format] of patterns) {
      const match = ua.match(pattern);
      if (match) return format(match);
    }
    return null;
  };
  const dots = (v: string) => v.replace(/_/g, ".");
  const os = first(
    [/Android ([\d.]+)/, (m) => `Android ${m[1]}`],
    [/(?:iPhone|iPad).*? OS ([\d_]+)/, (m) => `iOS ${dots(m[1])}`],
    [/Windows NT/, () => "Windows"],
    [/Mac OS X ([\d_.]+)/, (m) => `macOS ${dots(m[1])}`],
    [/CrOS/, () => "ChromeOS"],
    [/Linux/, () => "Linux"],
  );
  const browser = first(
    [/Line\/[\d.]+/, () => "LINE"],
    [/FBAN|FBAV/, () => "Facebook"],
    [/EdgA?\/(\d+)/, (m) => `Edge ${m[1]}`],
    [/SamsungBrowser\/(\d+)/, (m) => `Samsung Internet ${m[1]}`],
    [/CriOS\/(\d+)/, (m) => `Chrome ${m[1]}`],
    [/Chrome\/(\d+)/, (m) => `Chrome ${m[1]}`],
    [/Firefox\/(\d+)/, (m) => `Firefox ${m[1]}`],
    [/Version\/(\d+)[\d.]* .*Safari/, (m) => `Safari ${m[1]}`],
  );
  // Android puts the model after the version ("Android 15; SM-A546E Build/…"); "K" means hidden.
  const uaModel = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/)?.[1];
  const phone =
    (typeof model === "string" && model) ||
    (uaModel && uaModel !== "K" ? uaModel : null) ||
    first([/iPhone/, () => "iPhone"], [/iPad/, () => "iPad"]);
  return [os, browser, phone].filter(Boolean).join(" · ") || "-";
}
