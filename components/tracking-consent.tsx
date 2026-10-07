"use client";
import { Button } from "@/components/ui/button";
import { setTrackingConsent, useTrackingConsent } from "@/lib/analytics/consent";

export function TrackingConsent() {
  const consent = useTrackingConsent();
  return (
    <>
      {consent === "pending" && (
        <section
          aria-label="ตั้งค่าคุกกี้"
          className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-2xl rounded-xl border border-border bg-white p-4 text-foreground shadow-lg md:bottom-4"
        >
          <h2 className="text-sm font-semibold">เลือกการใช้คุกกี้</h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            คุกกี้สถิติช่วยวัดการเข้าเว็บและการคลิกติดต่อ ส่วนคุกกี้โฆษณาช่วยวัดผล Google Ads
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
