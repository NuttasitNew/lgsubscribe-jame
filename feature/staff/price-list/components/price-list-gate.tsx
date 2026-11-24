"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound } from "lucide-react";
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

const googleErrors: Record<string, string> = {
  cancelled: "ยกเลิกการเข้าสู่ระบบด้วย Google",
  expired: "หมดเวลาเข้าสู่ระบบ กรุณากดอีกครั้ง",
  failed: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {["บัญชี Google", "สังกัดทีม"].map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-6 bg-border" aria-hidden />}
            <span
              className={`grid size-6 place-items-center rounded-full ${
                done
                  ? "bg-emerald-600 text-white"
                  : active
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : step}
            </span>
            <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Shown instead of the price list: staff sign in with their own Google account (when configured),
 * then enter a valid access code.
 */
export function PriceListGate({
  google = null,
  googleError,
}: {
  google?: { email: string; name: string | null } | "required" | null;
  googleError?: string;
}) {
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
        if (result.google) {
          window.location.reload();
          return;
        }
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

  async function switchAccount() {
    await fetch("/api/price-list/logout/", { method: "POST" }).catch(() => undefined);
    // A full navigation: the API route redirects off-site to Google.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/api/price-list/google/";
  }

  const card = "w-full max-w-sm space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm";
  const heading = (
    <div className="flex items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <KeyRound className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-bold">ราคา &amp; ตารางผ่อน</h1>
    </div>
  );
  const notice = (
    <p className="text-center text-xs text-muted-foreground">
      การเข้าใช้ บัญชี และข้อมูลเครื่องถูกบันทึกเพื่อใช้ภายใน
    </p>
  );

  if (google === "required") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[hsl(36_25%_97%)] p-4">
        <div className={card}>
          {heading}
          <Steps current={1} />
          <p className="text-sm text-muted-foreground">
            เข้าสู่ระบบด้วยบัญชี Google ของคุณก่อน แล้วจึงใส่สังกัดทีม
          </p>
          {googleError && googleErrors[googleError] && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {googleErrors[googleError]}
            </p>
          )}
          <a
            href="/api/price-list/google/"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-white text-base font-semibold shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GoogleMark />
            เข้าสู่ระบบด้วย Google
          </a>
          {notice}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[hsl(36_25%_97%)] p-4">
      <form onSubmit={submit} className={card}>
        {heading}
        {google && <Steps current={2} />}
        {google && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white ring-1 ring-border">
              <GoogleMark />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              {google.name && <p className="truncate font-semibold">{google.name}</p>}
              <p className="truncate text-muted-foreground">{google.email}</p>
            </div>
            <button
              type="button"
              onClick={switchAccount}
              className="h-9 shrink-0 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              เปลี่ยนบัญชี
            </button>
          </div>
        )}
        <label className="block text-sm font-medium">
          สังกัดทีม
          <input
            name="code"
            required
            autoFocus
            type="text"
            autoComplete="off"
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
          {pending ? "กำลังตรวจสอบ…" : "เข้าใช้"}
        </Button>
        {notice}
      </form>
    </main>
  );
}
