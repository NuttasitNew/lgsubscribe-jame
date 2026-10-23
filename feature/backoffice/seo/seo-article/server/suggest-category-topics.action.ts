"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import { buildCategoryGrounding } from "./build-category-grounding.helper";
import { suggestCategoryTopics } from "./suggest-category-topics.helper";
import { SEO_DEMAND_TIERS, SEO_DEMAND_TIER_MAX_PER_TIER, type SeoDemandTier } from "../constant/seo-demand-tier";
import { normalizeServiceSubcategoryNames } from "../helper/service-subcategory.helper";
import type { SeoCategoryTopicSuggestion } from "../type/category-topic-suggestion.type";

/**
 * @description ขั้นที่ 1 ของการสั่งเขียนบทความตามหมวด — อ่านข้อมูลจริงของหมวดจากฐานข้อมูลแล้วให้ AI เสนอหัวข้อ
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic
 * - AI call เดียวและไม่ได้เขียนเนื้อหา ใช้เวลา ~10-20 วินาที → รอในหน้าจอได้ ไม่ต้องเข้าคิว
 *   (ขั้นเขียนบทความจริงที่ใช้ 1-2 นาทีต่อเรื่อง อยู่ที่ {@link ./queue-category-articles.action.ts})
 * - ไม่บันทึกอะไรลงฐานข้อมูล — ผลลัพธ์เป็นแค่ข้อเสนอ ผู้ใช้อาจไม่เลือกสักหัวข้อก็ได้
 * @param categoryCode รหัสหมวดบริการที่เลือก
 * @returns หัวข้อที่ AI เสนอพร้อมตัวเลขโฆษณาประกอบการตัดสินใจ
 * @used-by {@link ../tanstack/suggest-category-topics.mutation.ts}
 * @related {@link ./build-category-grounding.helper.ts}
 */
export interface SuggestCategoryTopicsParams {
  categoryCode: string;
  /** กลุ่มบริการย่อยที่ต้องการโฟกัส; ไม่ส่ง/ว่าง = ใช้ทั้งหมวดหลัก */
  subcategoryNames?: string[];
  /** จำนวนหัวข้อที่ต้องการต่อระดับความต้องการ — ไม่ส่ง = ค่าเริ่มต้น (ดู SEO_DEMAND_TIER_DEFAULT_QUOTA) */
  quota?: Partial<Record<SeoDemandTier, number>>;
}

export const suggestCategoryTopicsAction = async (
  params: SuggestCategoryTopicsParams
): Promise<ResponsePatternType<SeoCategoryTopicSuggestion[]>> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("lg_backoffice_session")?.value;
  if (!authToken) return ResponsePattern.unauthorized("no auth token");

  let decoded;
  try {
    decoded = await verifyByToken(authToken);
  } catch {
    return ResponsePattern.unauthorized("Token ไม่ถูกต้องหรือหมดอายุ");
  }

  if (decoded.role !== "SUPER_ADMIN") {
    return ResponsePattern.forbidden("[SEO-TOPIC-01] เฉพาะ super-admin เท่านั้น");
  }

  const trimmedCode = params.categoryCode?.trim();
  const subcategoryNames = normalizeServiceSubcategoryNames(params.subcategoryNames);
  if (!subcategoryNames) {
    return ResponsePattern.badRequest("[SEO-TOPIC-06] รูปแบบกลุ่มบริการย่อยไม่ถูกต้อง");
  }
  if (!trimmedCode) {
    return ResponsePattern.badRequest("[SEO-TOPIC-02] ไม่ได้ระบุหมวดหมู่บริการ");
  }

  // โควตาต้องถูกตรวจที่นี่ — ค่าจากหน้าจอเป็น input ที่ผู้ใช้แก้ได้ ปล่อยเข้า prompt ตรง ๆ
  // แล้วสั่ง "เสนอ 500 หัวข้อ" จะได้ค่า AI ที่แพงโดยไม่มีใครกั้น
  const quota = params.quota ?? {};
  for (const tier of SEO_DEMAND_TIERS) {
    const value = quota[tier];
    if (value == null) continue;
    if (!Number.isInteger(value) || value < 0 || value > SEO_DEMAND_TIER_MAX_PER_TIER) {
      return ResponsePattern.badRequest(`[SEO-TOPIC-05] จำนวนหัวข้อต่อระดับต้องเป็น 0-${SEO_DEMAND_TIER_MAX_PER_TIER}`);
    }
  }

  const log = fileLogger.session("เสนอหัวข้อบทความจากหมวดบริการ", {
    type: "R",
    id: `seo-topic:${trimmedCode}`,
    userName: decoded.name || "unknown",
  });

  try {
    const grounding = await buildCategoryGrounding(trimmedCode, subcategoryNames);
    if (!grounding) {
      return ResponsePattern.notFound(
        subcategoryNames.length > 0
          ? `[SEO-TOPIC-03] ไม่พบกลุ่มบริการย่อยที่เลือก (${subcategoryNames.join(", ")}) ในหมวดนี้`
          : "[SEO-TOPIC-03] ไม่พบหมวดหมู่บริการนี้"
      );
    }

    log.log(
      `บริการ ${grounding.serviceNames.length} รายการ (ยังไม่เคยขาย ` +
        `${grounding.serviceDemand.filter((service) => service.tier === "UNTAPPED").length} รายการ), ` +
        `คำค้น Ads ${grounding.adKeywords.length} คำ, คำที่มีคนค้น ${grounding.searchDemand.length} คำ`
    );

    const topics = await suggestCategoryTopics({ grounding, quota });
    if (topics.length === 0) {
      return ResponsePattern.ok("AI ไม่พบหัวข้อใหม่ที่คุ้มพอในหมวดนี้ (อาจเขียนครบแล้ว)", []);
    }

    log.end({ result: `เสนอ ${topics.length} หัวข้อ` });
    return ResponsePattern.ok(`เสนอ ${topics.length} หัวข้อ`, topics);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-TOPIC-04] เสนอหัวข้อไม่สำเร็จ");
  } finally {
    log.end();
  }
};
