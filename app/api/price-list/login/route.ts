import { NextResponse } from "next/server";
import { digest } from "@/lib/backoffice/auth";
import { getPrisma } from "@/lib/db/prisma";
import {
  accessCookie,
  accessMaxAge,
  createAccessToken,
  deviceCookie,
  deviceMaxAge,
  logAccess,
  normalizeCode,
  normalizeDeviceId,
  parseDevice,
} from "@/lib/price-list-access";
import { googleCookie, googleEnabled, parseIdentityToken } from "@/lib/price-list-google";

/** The page runs on its own hostname, so compare the browser Origin with the Host it called. */
function sameHost(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Staff enters one of the backoffice access codes to open /price-list/. Each sign-in is logged. */
export async function POST(request: Request) {
  if (!sameHost(request)) return new Response(null, { status: 403 });
  if (Number(request.headers.get("content-length")) > 4096) return new Response(null, { status: 413 });
  try {
    const prisma = getPrisma();
    const now = new Date();
    const bucket = Math.floor(now.getTime() / (15 * 60 * 1000));
    const address =
      request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "local";
    const key = digest(`price-list-login:${address}:${bucket}`);
    const attempt = await prisma.backofficeLoginAttempt.upsert({
      where: { key },
      create: { key, expiresAt: new Date((bucket + 1) * 15 * 60 * 1000) },
      update: { attempts: { increment: 1 } },
    });
    if (attempt.attempts > 20)
      return Response.json({ error: "ใส่รหัสผิดหลายครั้งเกินไป กรุณารอ 15 นาที" }, { status: 429 });

    // Google first (when configured), so every sign-in has a name.
    const identity = parseIdentityToken(
      request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${googleCookie}=([^;]+)`))?.[1],
    );
    if (googleEnabled() && !identity)
      return Response.json({ error: "กรุณาเข้าสู่ระบบด้วย Google ก่อน", google: true }, { status: 401 });

    const data = await request.json().catch(() => null);
    const code = normalizeCode(data?.code);
    const row = code ? await prisma.priceListAccessCode.findUnique({ where: { code } }) : null;
    if (!code || !row?.isActive) return Response.json({ error: "รหัสไม่ถูกต้อง" }, { status: 401 });

    const deviceId = normalizeDeviceId(data?.deviceId);
    await logAccess(code, "login", request.headers, { deviceId, device: parseDevice(data?.device), identity });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    const cookie = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.cookies.set(accessCookie, createAccessToken(code), { ...cookie, maxAge: accessMaxAge });
    // Page opens read the device id from this cookie (the form sends it only at sign-in).
    if (deviceId) response.cookies.set(deviceCookie, deviceId, { ...cookie, maxAge: deviceMaxAge });
    return response;
  } catch (reason) {
    console.error("price-list login failed", reason);
    return Response.json({ error: "เข้าใช้ไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 503 });
  }
}
