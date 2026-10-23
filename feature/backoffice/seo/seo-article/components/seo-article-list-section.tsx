"use client";

import React, { useEffect, useState } from "react";
import { SeoArticleStatus } from "@prisma/client";
import { Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFindSeoArticles } from "../tanstack/find-seo-articles.query";
import { SeoArticleCard } from "./seo-article-card";
import { SEO_ARTICLE_PAGE_SIZES, SeoArticlePaginationBar } from "./seo-article-pagination-bar";

/** หน่วงก่อนยิงค้นหา — พิมพ์รัว ๆ ไม่ควรยิง server action ทุกตัวอักษร */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * @description Section รายการบทความ SEO ตามสถานะ — ใช้ร่วมกันทั้ง section รอรีวิว/เผยแพร่แล้ว/ปัดตก/ทั้งหมด
 *              (ต่างกันแค่ status ที่ยิงเข้า query จึงเป็นไฟล์เดียว ไม่ก๊อป 4 ไฟล์ซ้ำ)
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-hub-main.tsx}
 * @access super-admin
 * @props { status: SeoArticleStatus | "ALL" } — "ALL" = ไม่กรองสถานะ
 * @features
 * - แถบ filter การ์ดขาว sticky แถวเดียว: ค้นหาชื่อ/slug (ค้นฝั่ง server พร้อมหน่วง 350ms)
 * - กริดการ์ดบทความ คลิกเปิด dialog รีวิว — การแก้เนื้อหาไปทำที่หน้าแก้ไขเต็มหน้า ไม่ใช่ใน dialog
 * - แบ่งหน้าฝั่ง server ผ่าน {@link seo-article-pagination-bar.tsx} (list ไม่ส่ง contentJson มาแล้ว จึงกรอง/นับฝั่ง client ไม่ได้)
 * @dependencies
 * - useFindSeoArticles: โหลดรายการตามสถานะ + หน้า + คำค้น
 * @related
 * - dialog: {@link seo-article-review-dialog.tsx}
 */
export const SeoArticleListSection = ({ status }: { status: SeoArticleStatus | "ALL" }) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(SEO_ARTICLE_PAGE_SIZES[0]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: articlesRes, isLoading } = useFindSeoArticles({
    status: status === "ALL" ? undefined : status,
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });

  const articles = articlesRes?.data?.items ?? [];
  const total = articlesRes?.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {/* ===== Section: filter แถวเดียว (sticky ที่หัวคอลัมน์ขวา) ===== */}
      <Card className="sticky top-0 z-10 shrink-0 p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              // เปลี่ยนคำค้นแล้วต้องกลับหน้า 1 ไม่งั้นค้างอยู่หน้า 5 ของผลลัพธ์ที่เหลือ 3 เรื่อง = จอว่าง
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อบทความ / slug"
              className="h-9 pl-8"
            />
          </div>

          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{total} เรื่อง</span>
        </div>
      </Card>

      {/* ===== Section: กริดการ์ดบทความ ===== */}
      <Card className="p-3 md:p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {debouncedSearch
              ? "ไม่พบบทความที่ตรงกับคำค้น — ลองล้างคำค้นดู"
              : "ไม่มีบทความในสถานะนี้ — กด “สร้างบทความ” เพื่อให้ AI เขียนร่างใหม่"}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {articles.map((article) => (
              <SeoArticleCard key={article.seoArticleId} article={article} />
            ))}
          </div>
        )}
      </Card>

      {/* ===== Section: แบ่งหน้า ===== */}
      <SeoArticlePaginationBar
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />

      {/* dialog รีวิว — โหลดเนื้อหาบทความที่เลือกเอง (list ไม่ส่ง contentJson มาแล้ว) */}
    </div>
  );
};
