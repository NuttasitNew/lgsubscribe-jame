"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** ตัวเลือกจำนวนบทความต่อหน้า */
export const SEO_ARTICLE_PAGE_SIZES = [12, 24, 48] as const;

interface SeoArticlePaginationBarProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * @description แถบแบ่งหน้าของรายการบทความ SEO
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @parent {@link seo-article-list-section.tsx}
 * @props { page, pageSize, totalItems, onPageChange, onPageSizeChange }
 * @features
 * - การ์ดขาวแถวเดียวตามดีไซน์ของ repo (พื้นเทา + การ์ดขาว)
 * - บอกช่วงที่กำลังดู (เช่น 13-24 จาก 57 เรื่อง) ไม่ใช่แค่เลขหน้า
 * - ซ่อนตัวเองเมื่อมีบทความไม่ถึง 1 หน้า — ไม่กินที่จอเปล่า ๆ
 * @logic
 * - เป็น component ใบ้ทั้งหมด (ไม่รู้จัก query) → ย้ายไปแบ่งหน้าฝั่ง server ทีหลังได้โดยไม่ต้องแก้ไฟล์นี้
 */
export const SeoArticlePaginationBar = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: SeoArticlePaginationBarProps) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= SEO_ARTICLE_PAGE_SIZES[0] && totalPages <= 1) return null;

  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
      <span className="text-xs text-muted-foreground">
        {firstItem}-{lastItem} จาก {totalItems} เรื่อง
      </span>

      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEO_ARTICLE_PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} ต่อหน้า
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[70px] text-center text-xs text-muted-foreground">
          หน้า {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </Card>
  );
};
