import "server-only";
import prisma from "@/lib/seo/prisma";
import { defaultBrandProfile } from "../helper/default-brand-profile";
import { brandProfileInputSchema } from "../helper/brand-profile-schema";
import type { BrandProfile } from "../type/brand-profile.type";

/** @description อ่าน snapshot สำหรับหน้า settings และ AI @logic ไม่มี record ใช้ค่าเดิม; DB error ไม่ fallback เงียบ @used-by getBrandProfile, image generators */
export const readBrandProfile = async (): Promise<BrandProfile> => {
  const row = await prisma.seoBrandProfile.findUnique({ where: { id: "hurryclean" } });
  if (!row) return defaultBrandProfile();
  const data = brandProfileInputSchema.parse(row);
  return { ...data, updatedBy: row.updatedBy, updatedAt: row.updatedAt.toISOString() };
};
