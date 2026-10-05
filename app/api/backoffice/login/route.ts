import { NextResponse } from "next/server";
import {
  authConfigured,
  createSession,
  digest,
  passwordMatches,
  sameOrigin,
  sessionCookie,
  sessionMaxAge,
} from "@/lib/backoffice/auth";
import { getPrisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!authConfigured()) return Response.json({ error: "ระบบยังไม่ได้ตั้งค่าบัญชีผู้ดูแล" }, { status: 503 });
  if (Number(request.headers.get("content-length")) > 4096) return new Response(null, { status: 413 });
  try {
    const prisma = getPrisma();
    const now = new Date();
    const bucket = Math.floor(now.getTime() / (15 * 60 * 1000));
    const address =
      request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "local";
    const key = digest(`login:${address}:${bucket}`);
    const attempt = await prisma.backofficeLoginAttempt.upsert({
      where: { key },
      create: { key, expiresAt: new Date((bucket + 1) * 15 * 60 * 1000) },
      update: { attempts: { increment: 1 } },
    });
    await prisma.backofficeLoginAttempt.deleteMany({ where: { expiresAt: { lt: now } } });
    if (attempt.attempts > 10)
      return Response.json({ error: "ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที" }, { status: 429 });
    const data = await request.json();
    if (
      !data ||
      typeof data.username !== "string" ||
      typeof data.password !== "string" ||
      !passwordMatches(data.username, data.password)
    ) {
      return Response.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookie, createSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: sessionMaxAge,
    });
    return response;
  } catch {
    return Response.json({ error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 503 });
  }
}
