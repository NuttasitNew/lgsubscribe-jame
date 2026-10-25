import "server-only";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";

/**
 * @description ตรวจ session หลังบ้าน + สิทธิ์ seo.manage สำหรับ action หน้า keyword
 * @returns ชื่อผู้ใช้ หรือข้อความ error ที่พร้อมส่งกลับ (ไม่ throw — action ต้องตอบ ResponsePattern)
 */
export const requireSeoManager = async (): Promise<{ ok: true; name: string } | { ok: false; status: 401 | 403; message: string }> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("lg_backoffice_session")?.value;
  if (!authToken) return { ok: false, status: 401, message: "no auth token" };
  try {
    const decoded = await verifyByToken(authToken);
    if (decoded.role !== "SUPER_ADMIN") return { ok: false, status: 403, message: "[SEO-KW-AUTH] ไม่มีสิทธิ์ seo.manage" };
    return { ok: true, name: decoded.name || "unknown" };
  } catch {
    return { ok: false, status: 401, message: "Token ไม่ถูกต้องหรือหมดอายุ" };
  }
};
