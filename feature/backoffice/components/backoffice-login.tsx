"use client";

import { useActionState } from "react";
import { login } from "@/feature/backoffice/auth/actions";

export function BackofficeLogin() {
  const [state, action, pending] = useActionState(login, { message: "" });
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef0f2] px-4">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <p className="font-bold text-primary">LG · Backoffice</p>
        <h1 className="mt-6 text-2xl font-semibold">เข้าสู่ระบบหลังบ้าน</h1>
        <p className="mt-2 text-sm text-muted-foreground">จัดการคำค้นหาและติดตามผล SEO ของเว็บไซต์</p>
        <form action={action} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            รหัสผ่านผู้ดูแล
            <input
              name="password"
              type="password"
              required
              maxLength={256}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          {state.message && (
            <p role="alert" className="text-sm text-red-700">
              {state.message}
            </p>
          )}
          <button
            disabled={pending}
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {pending ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </section>
    </main>
  );
}
