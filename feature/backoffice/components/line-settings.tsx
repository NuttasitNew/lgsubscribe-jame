"use client";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
export type SecretStatus = {
  key: string;
  label: string;
  help: string;
  source: "database" | "env" | "none";
  last4: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
};
const dateFormat = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});
function StatusLine({ secret }: { secret: SecretStatus }) {
  if (secret.source === "database")
    return (
      <p className="text-sm text-green-700">
        ตั้งค่าแล้ว · ลงท้ายด้วย ••••{secret.last4}
        <span className="block text-xs text-slate-500">
          {secret.updatedAt && dateFormat.format(new Date(secret.updatedAt))}
          {secret.updatedByName && ` · โดย ${secret.updatedByName}`}
        </span>
      </p>
    );
  if (secret.source === "env")
    return (
      <p className="text-sm text-amber-700">
        ใช้ค่าจาก Environment Variable เดิม · กรอกที่นี่เพื่อย้ายมาจัดการในเว็บ
      </p>
    );
  return <p className="text-sm text-red-700">ยังไม่ได้ตั้งค่า</p>;
}
function SecretForm({
  secret,
  disabled,
  onSaved,
}: {
  secret: SecretStatus;
  disabled: boolean;
  onSaved: (secrets: SecretStatus[], message: string) => void;
}) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function send(value: string | null) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/backoffice/line/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: secret.key, value }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "บันทึกไม่สำเร็จ");
        return false;
      }
      onSaved(result.secrets, value === null ? `ลบ ${secret.label} แล้ว` : `บันทึก ${secret.label} แล้ว`);
      return true;
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
      return false;
    } finally {
      setPending(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (await send(String(new FormData(form).get("value") ?? ""))) form.reset();
  }
  return (
    <form onSubmit={submit} className="space-y-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={id} className="font-semibold">
          {secret.label}
        </label>
        <StatusLine secret={secret} />
      </div>
      <fieldset disabled={pending || disabled} className="space-y-2">
        <PasswordInput
          id={id}
          name="value"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={secret.source === "none" ? "วางค่าที่นี่" : "วางค่าใหม่เพื่อแทนที่ค่าเดิม"}
          disabled={pending || disabled}
        />
        <p className="text-xs text-slate-500">{secret.help}</p>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || disabled}>
          {pending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
        {secret.source === "database" && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  `ลบ ${secret.label} ออกจากฐานข้อมูล? ระบบจะกลับไปใช้ค่าจาก Environment Variable (ถ้ามี)`,
                )
              )
                void send(null);
            }}
          >
            ลบค่านี้
          </Button>
        )}
      </div>
    </form>
  );
}
export function LineSettings({
  initial,
  encryptionReady,
  webhookUrl,
}: {
  initial: SecretStatus[];
  encryptionReady: boolean;
  webhookUrl: string;
}) {
  const [secrets, setSecrets] = useState(initial);
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-5">
      {!encryptionReady && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          เซิร์ฟเวอร์ยังไม่มี SETTINGS_ENCRYPTION_KEY จึงยังบันทึกค่าลับไม่ได้ ผู้ดูแลระบบต้องเพิ่มค่านี้ใน
          Vercel ก่อน
        </p>
      )}
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <h2 className="font-semibold">Webhook URL</h2>
        <p className="mt-1 text-sm text-slate-500">
          นำไปใส่ใน LINE Developers &gt; Messaging API &gt; Webhook URL
        </p>
        <code className="mt-3 block break-all rounded-md bg-slate-100 p-3 text-sm">{webhookUrl}</code>
      </section>
      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}
      <section className="divide-y rounded-xl border bg-white">
        {secrets.map((secret) => (
          <SecretForm
            key={secret.key}
            secret={secret}
            disabled={!encryptionReady}
            onSaved={(next, text) => {
              setSecrets(next);
              setMessage(text);
            }}
          />
        ))}
      </section>
    </div>
  );
}
