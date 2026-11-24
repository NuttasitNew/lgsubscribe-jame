"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Random id kept in this browser so the backoffice can tell devices apart (no permission needed). */
function deviceId() {
  const key = "price-list-device";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

type UAData = {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platformVersion?: string }>;
};

/** Device details that need no permission prompt; the phone model comes from Chrome's client hints. */
async function deviceDetails() {
  const ua = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  const hints = await Promise.race([
    ua?.getHighEntropyValues?.(["model", "platformVersion"]).catch(() => undefined),
    new Promise<undefined>((resolve) => setTimeout(resolve, 500)),
  ]);
  return {
    screen: `${screen.width}x${screen.height}`,
    dpr: window.devicePixelRatio,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touch: navigator.maxTouchPoints,
    platform: ua?.platform,
    model: hints?.model || undefined,
    platformVersion: hints?.platformVersion || undefined,
  };
}

/** Shown instead of the price list until staff enter a valid access code. */
export function PriceListGate() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/price-list/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, deviceId: deviceId(), device: await deviceDetails() }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.error ?? "เข้าใช้ไม่สำเร็จ");
        return;
      }
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[hsl(36_25%_97%)] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold">ราคา &amp; ตารางผ่อน</h1>
        </div>
        <label className="block text-sm font-medium">
          รหัสผ่าน
          <input
            name="code"
            required
            autoFocus
            type="password"
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            className="mt-1 h-12 w-full rounded-xl border border-input bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="h-12 w-full text-base">
          {pending ? "กำลังตรวจรหัส…" : "เข้าใช้"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          การเข้าใช้และข้อมูลเครื่องถูกบันทึกเพื่อใช้ภายใน
        </p>
      </form>
    </main>
  );
}
