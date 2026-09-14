"use server";

import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { authConfigured, sessionCookie } from "./session";
import { signSession, verifyPassword } from "./crypto";

export async function login(_state: { message: string }, form: FormData) {
  if (!authConfigured()) return { message: "ยังไม่ได้ตั้งค่าบัญชีผู้ดูแลบนเซิร์ฟเวอร์" };
  const password = String(form.get("password") ?? "");
  if (!password || password.length > 256) return { message: "กรุณาตรวจสอบรหัสผ่าน" };
  const ip = process.env.VERCEL
    ? ((await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown")
    : "local";
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  const key = createHmac("sha256", process.env.BACKOFFICE_SESSION_SECRET!)
    .update(`${ip}:${bucket}`)
    .digest("hex");
  let attempt;
  try {
    attempt = await getPrisma().backofficeLoginAttempt.upsert({
      where: { key },
      create: { key, expiresAt: new Date((bucket + 1) * 15 * 60 * 1000) },
      update: { attempts: { increment: 1 } },
    });
  } catch {
    return { message: "ระบบเข้าสู่ระบบไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง" };
  }
  if (attempt.attempts > 5) return { message: "ลองเข้าสู่ระบบหลายครั้ง กรุณารอ 15 นาที" };
  if (!verifyPassword(password, process.env.BACKOFFICE_PASSWORD_HASH!))
    return { message: "กรุณาตรวจสอบรหัสผ่าน" };
  await getPrisma().backofficeLoginAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  (await cookies()).set(
    sessionCookie,
    signSession(process.env.BACKOFFICE_SESSION_SECRET!, process.env.BACKOFFICE_PASSWORD_HASH!),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/backoffice",
      maxAge: 8 * 60 * 60,
    },
  );
  redirect("/backoffice/seo/");
}

export async function logout() {
  (await cookies()).set(sessionCookie, "", {
    path: "/backoffice",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  redirect("/backoffice/auth/login/");
}
