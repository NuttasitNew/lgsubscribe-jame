"use client";

import React from "react";
import { Check, Layers3, Loader2, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFindServiceCategories } from "../tanstack/find-service-categories.query";

interface SeoArticleCategoryPickerProps {
  selectedCategoryCode: string | null;
  selectedSubcategoryNames: string[];
  onSelect: (categoryCode: string, categoryName: string) => void;
  onToggleSubcategory: (subcategoryName: string) => void;
  onClearSubcategories: () => void;
}

/**
 * @description ขั้นที่ 1 ของไดอะล็อกสั่งเขียนบทความ — เลือกหมวดหลักและกลุ่มบริการย่อยจากรายการจริง
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-category-generate-dialog.tsx}
 * @access super-admin
 * @props หมวดหลัก/กลุ่มย่อยที่เลือก และ callbacks เปลี่ยน selection
 * @features
 * - แสดงหมวดจริงจาก ServiceCategoryDescription พร้อมจำนวนบริการ/ออเดอร์/ช่วงราคา — ไม่ hardcode รายการหมวด
 * - เรียงหมวดที่มีออเดอร์เยอะไว้บน (มาจากฝั่ง server) ให้หมวดที่ทำจริงบ่อยกดง่ายที่สุด
 * - หมวดที่ยังไม่เคยมีออเดอร์ยังแสดงอยู่ — เป็นบริการที่มีจริงแต่ยังไม่มีคนรู้จัก ควรเขียนบทความที่สุด
 * - เมื่อเลือกหมวดหลัก จะแสดงกลุ่มบริการย่อยพร้อมจำนวนบริการ/ออเดอร์จริงให้โฟกัส AI ได้ถึงระดับ โซฟา/ที่นอน/ม่าน
 * @dependencies
 * - useFindServiceCategories: โหลดหมวด (ยิงเฉพาะตอนไดอะล็อกเปิด)
 */
export const SeoArticleCategoryPicker = ({
  selectedCategoryCode,
  selectedSubcategoryNames,
  onSelect,
  onToggleSubcategory,
  onClearSubcategories,
}: SeoArticleCategoryPickerProps) => {
  const { data: categoryResult, isLoading } = useFindServiceCategories(true);

  const categories = React.useMemo(() => {
    if (categoryResult?.status !== "ok") return [];
    return categoryResult.data ?? [];
  }, [categoryResult]);

  const selectedCategory = React.useMemo(
    () => categories.find((category) => category.categoryCode === selectedCategoryCode) ?? null,
    [categories, selectedCategoryCode]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        กำลังโหลดหมวดหมู่บริการ...
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
        <PackageSearch className="h-6 w-6" />
        ไม่พบหมวดหมู่บริการในระบบ
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {categories.map((category) => {
          const isSelected = category.categoryCode === selectedCategoryCode;
          return (
            <button
              key={category.categoryCode}
              type="button"
              onClick={() => onSelect(category.categoryCode, category.categoryName)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold md:text-base">{category.categoryName}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground md:text-xs">{category.categoryCode}</span>
              </div>

              <p className="mt-1 text-[11px] text-muted-foreground md:text-xs">
                {category.serviceCount.toLocaleString()} บริการ · {category.orderCount.toLocaleString()} ออเดอร์
              </p>

              {category.minPrice != null && category.maxPrice != null && (
                <p className="mt-0.5 text-[11px] text-muted-foreground md:text-xs">
                  ราคา {category.minPrice.toLocaleString()}-{category.maxPrice.toLocaleString()} บาท
                </p>
              )}
            </button>
          );
        })}
      </div>

      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <section className="rounded-xl border bg-muted/20 p-3">
          <div className="mb-2 flex items-start gap-2">
            <Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">เลือกกลุ่มบริการย่อยที่อยากให้ AI โฟกัส</p>
              <p className="text-[11px] text-muted-foreground md:text-xs">
                เลือกได้หลายกลุ่ม · ถ้าไม่เลือก ระบบจะใช้บริการทั้งหมดในหมวดหลัก
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClearSubcategories}
              aria-pressed={selectedSubcategoryNames.length === 0}
              className={cn(
                "rounded-lg border bg-background p-2.5 text-left text-xs transition-colors",
                selectedSubcategoryNames.length === 0
                  ? "border-primary ring-1 ring-primary"
                  : "hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <span className="flex items-center gap-1.5 font-medium">
                {selectedSubcategoryNames.length === 0 && <Check className="h-3.5 w-3.5 text-primary" />}
                ทั้งหมดในหมวด {selectedCategory.categoryName}
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground md:text-[11px]">
                ใช้ครบ {selectedCategory.serviceCount.toLocaleString()} บริการ
              </span>
            </button>

            {selectedCategory.subcategories.map((subcategory) => {
              const isSelected = selectedSubcategoryNames.includes(subcategory.subcategoryName);
              return (
                <button
                  key={subcategory.subcategoryName}
                  type="button"
                  onClick={() => onToggleSubcategory(subcategory.subcategoryName)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg border bg-background p-2.5 text-left text-xs transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    {subcategory.subcategoryName}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground md:text-[11px]">
                    {subcategory.serviceCount.toLocaleString()} บริการ · {subcategory.orderCount.toLocaleString()}{" "}
                    ออเดอร์
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
