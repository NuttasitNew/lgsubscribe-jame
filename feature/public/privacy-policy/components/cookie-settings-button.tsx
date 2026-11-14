"use client";
import { Button } from "@/components/ui/button";
import { resetTrackingConsent, useTrackingConsent } from "@/lib/analytics/consent";

const consentLabels = {
  necessary: "เฉพาะที่จำเป็น",
  analytics: "อนุญาตสถิติ",
  all: "อนุญาตทั้งหมด",
  pending: "ยังไม่ได้เลือก",
} as const;

/** Shows the visitor's current cookie choice and reopens the consent banner. */
export function CookieSettingsButton() {
  const consent = useTrackingConsent();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-neutral-700">
        ตัวเลือกปัจจุบันของคุณ: <span className="font-semibold">{consentLabels[consent]}</span>
      </p>
      <Button type="button" size="sm" variant="outline" onClick={() => resetTrackingConsent()}>
        เปลี่ยนการตั้งค่าคุกกี้
      </Button>
    </div>
  );
}
