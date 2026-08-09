import type { Metadata } from "next";
import { requireLocalBackofficePreview } from "@/feature/backoffice/require-local-backoffice-preview";

export const metadata: Metadata = {
  title: {
    default: "Backoffice",
    template: "%s | Backoffice",
  },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * ขอบเขตความปลอดภัยของ /backoffice/** ทั้งหมด:
 * ตอนนี้อนุญาตให้ render เฉพาะ local design preview เท่านั้น และห้ามย้ายหน้าภายในออกจาก layout นี้
 * เมื่อเชื่อม Neon Auth ต้องเปลี่ยน guard ตรงนี้เป็นการตรวจ session ก่อนเปิด production
 */
export default function ProtectedBackofficeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  requireLocalBackofficePreview();

  return <>{children}</>;
}
