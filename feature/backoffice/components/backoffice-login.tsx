"use client";

import { useId, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackofficeLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/backoffice/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      } else {
        router.push("/backoffice/analytics/");
        router.refresh();
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef0f2] px-4 py-8 text-[#1d1f22]">
      <section className="w-full max-w-md rounded-2xl border border-[#d4d7da] bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#c4142e] font-bold text-white">
            LG
          </span>
          <div>
            <h1 className="text-xl font-semibold">เข้าสู่ Backoffice</h1>
            <p className="text-sm text-[#74797e]">LG Subscribe · สำหรับผู้ดูแลเว็บไซต์</p>
          </div>
        </div>
        {!configured && (
          <p role="status" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            ยังไม่ได้ตั้งค่าบัญชีผู้ดูแล กรุณาติดต่อผู้ดูแลระบบ
          </p>
        )}
        <form onSubmit={login} className="space-y-4">
          <label className="block text-sm font-medium">
            ชื่อผู้ใช้ (ID)
            <input
              name="username"
              autoComplete="username"
              required
              maxLength={100}
              disabled={!configured || pending}
              className="mt-2 h-10 w-full rounded-md border border-[#d4d7da] bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <div>
            <label htmlFor={passwordId} className="block text-sm font-medium">รหัสผ่าน</label>
            <div className="relative mt-2">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={256}
                disabled={!configured || pending}
                className="h-11 w-full rounded-md border border-[#d4d7da] bg-white pl-3 pr-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-0 top-0 size-11"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-pressed={showPassword}
                aria-controls={passwordId}
                disabled={!configured || pending}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={!configured || pending}>
            {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </Button>
        </form>
        <p className="mt-6 text-xs text-[#74797e]">ระบบจะออกจากบัญชีเมื่อครบ 24 ชั่วโมง</p>
      </section>
    </main>
  );
}
