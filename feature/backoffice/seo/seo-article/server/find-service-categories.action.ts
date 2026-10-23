"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import { buildServiceSubcategoryOptions, listCatalogCategories } from "../helper/service-subcategory.helper";
import type { ServiceCategoryOption } from "../type/service-category-option.type";

/** แถวดิบจาก SQL รวมยอด — count มาเป็น bigint ต้องแปลงเป็น number ก่อนส่งข้าม server action */
/**
 * @description ดึงหมวดสินค้าในแคตตาล็อก LG พร้อมรุ่นและราคาเช่ารายเดือน ให้ไดอะล็อกสั่งเขียนบทความ
 * @page /backoffice/seo/
 * @access seo.manage
 * @logic อ่านจาก lib/product-knowledge.ts + lib/catalog-products.ts (ไม่มีข้อมูลออเดอร์ → orderCount = 0)
 */
export const findServiceCategories = async (): Promise<ResponsePatternType<ServiceCategoryOption[]>> => {
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
    return ResponsePattern.forbidden("[SEO-CAT-01] เฉพาะ super-admin เท่านั้น");
  }

  const log = fileLogger.session("ดึงหมวดสินค้าสำหรับเขียนบทความ", {
    type: "R",
    id: "seo-service-categories",
    userName: decoded.name || "unknown",
  });

  try {
    const categories: ServiceCategoryOption[] = listCatalogCategories().map((category) => {
      const prices = category.products
        .map((product) => product.monthlyPrice)
        .filter((price): price is number => price != null);
      return {
        categoryCode: category.categoryCode,
        categoryName: category.categoryName,
        serviceCount: category.products.length,
        orderCount: 0,
        minPrice: prices.length > 0 ? Math.min(...prices) : null,
        maxPrice: prices.length > 0 ? Math.max(...prices) : null,
        subcategories: buildServiceSubcategoryOptions(category.categoryCode),
      };
    });

    log.end({ result: `${categories.length} หมวด` });
    return ResponsePattern.ok("ดึงหมวดสินค้าสำเร็จ", categories);
  } catch (error) {
    log.error(error instanceof Error ? error.message : "Unknown");
    return ResponsePattern.error("[SEO-CAT-02] ดึงหมวดสินค้าไม่สำเร็จ");
  } finally {
    log.end();
  }
};
