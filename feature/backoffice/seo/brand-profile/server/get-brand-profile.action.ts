"use server";
import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, type ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import type { BrandProfile } from "../type/brand-profile.type";
import { readBrandProfile } from "./read-brand-profile";
/** @description อ่านชุดอ้างอิงบริษัท @access super-admin @logic ตรวจสิทธิ์ก่อนอ่าน @used-by useBrandProfile */
export const getBrandProfile = async (): Promise<ResponsePatternType<BrandProfile>> => {
  const token = (await cookies()).get("lg_backoffice_session")?.value;
  if (!token) return ResponsePattern.unauthorized("กรุณาเข้าสู่ระบบ");
  let user;
  try {
    user = await verifyByToken(token);
  } catch {
    return ResponsePattern.unauthorized("กรุณาเข้าสู่ระบบใหม่");
  }
  if (user.role !== "SUPER_ADMIN") return ResponsePattern.forbidden("เฉพาะผู้ดูแลระบบสูงสุด");
  const log = fileLogger.session("อ่านชุดอ้างอิงบริษัท", { type: "R", userName: user.name || "unknown" });
  try {
    return ResponsePattern.ok("โหลดชุดอ้างอิงแล้ว", await readBrandProfile());
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("โหลดชุดอ้างอิงไม่สำเร็จ กรุณาลองใหม่");
  } finally {
    log.end();
  }
};
