"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setTrackingConsent, useTrackingConsent } from "@/lib/analytics/consent";

export function TrackingConsent() {
  const consent = useTrackingConsent();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-3 z-40 rounded-full border border-border bg-white px-3 py-1 text-[11px] text-muted-foreground shadow-sm md:bottom-3"
      >
        ตั้งค่าคุกกี้
      </button>
      {(consent === "pending" || open) && (
        <section
          aria-label="ตั้งค่าคุกกี้"
          className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-2xl rounded-xl border border-border bg-white p-4 text-foreground shadow-lg md:bottom-4"
        >
          <h2 className="text-sm font-semibold">เลือกการใช้คุกกี้</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            คุกกี้สถิติช่วยวัดการเข้าเว็บและการคลิกติดต่อ ส่วนคุกกี้โฆษณาช่วยวัดผล Google Ads
            คุณเปลี่ยนตัวเลือกได้ที่ “ตั้งค่าคุกกี้”
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { value: "necessary", label: "เฉพาะที่จำเป็น" },
                { value: "analytics", label: "อนุญาตสถิติ" },
                { value: "all", label: "อนุญาตทั้งหมด" },
              ] as const
            ).map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={item.value === "all" ? "default" : "outline"}
                onClick={() => {
                  setTrackingConsent(item.value);
                  setOpen(false);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
