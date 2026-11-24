"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type AccessCode = { code: string; label: string | null; isActive: boolean };

const field =
  "mt-1 h-11 w-full rounded-md border bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Add staff codes and switch them on/off for /price-list/. */
export function PriceListCodes({ codes }: { codes: AccessCode[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function send(method: "POST" | "PATCH", body: Record<string, unknown>) {
    setPending(String(body.code));
    setError("");
    try {
      const response = await fetch("/api/backoffice/price-list/codes/", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "บันทึกไม่สำเร็จ");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
      return false;
    } finally {
      setPending(null);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (await send("POST", { code: data.get("code"), label: data.get("label") })) form.reset();
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#d4d7da] bg-white">
      <h2 className="border-b border-[#d4d7da] px-4 py-3 font-semibold">จัดการรหัส ({codes.length})</h2>
      <form
        onSubmit={add}
        className="grid gap-3 border-b border-[#e5e7e9] p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
      >
        <label className="text-sm font-medium">
          รหัสใหม่
          <input name="code" required placeholder="เช่น lsm100" autoCapitalize="none" className={field} />
        </label>
        <label className="text-sm font-medium">
          ชื่อ/หมายเหตุ (ไม่บังคับ)
          <input name="label" placeholder="เช่น ชื่อพนักงาน หรือสาขา" className={field} />
        </label>
        <Button type="submit" disabled={pending !== null} className="h-11">
          เพิ่มรหัส
        </Button>
      </form>
      {error && (
        <p role="alert" className="border-b border-[#e5e7e9] px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {codes.length === 0 ? (
        <p className="p-4 text-sm text-[#666b70]">
          ยังไม่มีรหัส — เพิ่มรหัสด้านบนก่อน พนักงานถึงจะเข้าหน้าราคาได้
        </p>
      ) : (
        <ul className="divide-y divide-[#e5e7e9]">
          {codes.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className={c.isActive ? "font-semibold" : "font-semibold text-[#666b70] line-through"}>
                  {c.code}
                </p>
                {c.label && <p className="text-sm text-[#666b70]">{c.label}</p>}
              </div>
              <span
                className={
                  c.isActive
                    ? "rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                    : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                }
              >
                {c.isActive ? "ใช้ได้" : "ปิดอยู่"}
              </span>
              <Button
                variant="outline"
                disabled={pending !== null}
                onClick={() => {
                  if (c.isActive && !window.confirm(`ปิดรหัส ${c.code}? คนที่ใช้รหัสนี้จะถูกให้ใส่รหัสใหม่`))
                    return;
                  send("PATCH", { code: c.code, isActive: !c.isActive });
                }}
                className="h-10"
              >
                {c.isActive ? "ปิดรหัส" : "เปิดใช้"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
