"use server";
import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, type ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import type { BrandProfile } from "../type/brand-profile.type";
import prisma from "@/lib/seo/prisma";
import { brandProfileInputSchema } from "../helper/brand-profile-schema";
/** @description บันทึกชุดอ้างอิงถาวร @access super-admin @logic compare revision ใน transaction ป้องกันการเขียนทับ @used-by useSaveBrandProfile */
export const saveBrandProfile = async (input: unknown): Promise<ResponsePatternType<BrandProfile>> => {
  const token = (await cookies()).get("lg_backoffice_session")?.value;
  if (!token) return ResponsePattern.unauthorized("กรุณาเข้าสู่ระบบ");
  let user;
  try {
    user = await verifyByToken(token);
  } catch {
    return ResponsePattern.unauthorized("กรุณาเข้าสู่ระบบใหม่");
  }
  if (user.role !== "SUPER_ADMIN") return ResponsePattern.forbidden("เฉพาะผู้ดูแลระบบสูงสุด");
  const log = fileLogger.session("บันทึกชุดอ้างอิงบริษัท", { type: "U", userName: user.name || "unknown" });
  try {
    const parsed = brandProfileInputSchema.safeParse(input);
    if (!parsed.success) return ResponsePattern.validationError(parsed.error.issues[0].message);
    const { revision, systemPrompt, references } = parsed.data;
    const row = await prisma.$transaction(async (tx) => {
      if (revision === 0)
        return tx.seoBrandProfile.create({
          data: { id: "hurryclean", systemPrompt, references, updatedBy: user.name || "unknown" },
        });
      const result = await tx.seoBrandProfile.updateMany({
        where: { id: "hurryclean", revision },
        data: { systemPrompt, references, revision: { increment: 1 }, updatedBy: user.name || "unknown" },
      });
      if (result.count !== 1) throw new Error("BRAND_CONFLICT");
      return tx.seoBrandProfile.findUniqueOrThrow({ where: { id: "hurryclean" } });
    });
    log.end({ result: `revision:${row.revision}` });
    return ResponsePattern.ok("บันทึกชุดอ้างอิงแล้ว", {
      ...parsed.data,
      revision: row.revision,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    if (
      (error instanceof Error && error.message === "BRAND_CONFLICT") ||
      (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
    )
      return ResponsePattern.error("มีผู้แก้ไขชุดนี้แล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง");
    return ResponsePattern.error("บันทึกไม่สำเร็จ ข้อมูลที่แก้ยังอยู่ กรุณาลองใหม่");
  } finally {
    log.end();
  }
};
