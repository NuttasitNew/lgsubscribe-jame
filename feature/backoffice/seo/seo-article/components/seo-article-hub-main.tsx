"use client";

import React from "react";
import Link from "next/link";
import { Image as ImageIcon, Newspaper, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageSectionSidebar } from "@/components/shared/page-section-sidebar";
import { useWatchSeoArticleJobs } from "../tanstack/use-watch-seo-article-jobs";
import { useSeoArticleSection } from "../nuqs/seo-article-section-param";
import { useSeoArticleEditParam } from "../nuqs/seo-article-edit-param";
import { SeoArticleEditorPage } from "./seo-article-editor-page";
import {
  SEO_ARTICLE_SECTION_ITEMS,
  SEO_ARTICLE_SECTION_STATUS,
  type SeoArticleSectionKey,
} from "../type/seo-article-section.type";
import { useSeoArticleCategoryGenerateStore } from "../zustand/seo-article-category-generate.store";
import { useSeoArticleNavigation } from "../nuqs/seo-article-navigation-param";
import { SeoArticleReviewDialog } from "./seo-article-review-dialog";
import { SeoArticleCategoryGenerateDialog } from "./seo-article-category-generate-dialog";
import { SeoArticleJobStatusBar } from "./seo-article-job-status-bar";
import { SeoArticleListSection } from "./seo-article-list-section";
import { SeoArticleMetricsSection } from "./seo-article-metrics-section";
import { SeoArticleOverviewSection } from "./seo-article-overview-section";
import { AskAnswerFaqSection } from "../../ask-answer-faq/components/ask-answer-faq-section";

/**
 * @description หน้า hub บทความ SEO — พื้นเทา + section การ์ดขาว + in-page sidebar (แทน tab เดิม)
 *              รวมทั้งรายการบทความตามสถานะ, ภาพรวมหัวข้อจากแชท และผลวัด Google Search Console
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin (guard ที่ middleware.ts สำหรับ /super-admin/*)
 * @props ไม่มี — อ่าน section จาก URL
 * @features
 * - โครงพอดีจอ: flex-col + h-[calc(100dvh-50px)] (header ของ layout (management-program) สูง 50px)
 * - sidebar 6 section sync กับ URL ?section= (nuqs, history push → กด back/แชร์ลิงก์ได้)
 * - ปุ่มสั่งเขียน 2 ทางอยู่ที่ header (ซ่อนใน section ผลบน Google ที่ไม่เกี่ยว) — **เข้าคิวทั้งคู่ ไม่มีการยืนรอ**
 * - แถบสถานะคิวใต้ header — สั่งงานแล้วเปลี่ยนหน้าไปทำอย่างอื่น กลับมาก็ยังเห็นว่าถึงไหนแล้ว
 * - เป็นจุดเดียวที่เรียก useWatchSeoArticleJobs (ครอบทั้งหน้า hub และหน้าแก้ไขที่ render ต่อจากนี่)
 *   งานที่จบจึง sync cache ที่เดียว ไม่ยิง invalidate ซ้อนกันหลายรอบ
 * - mount เฉพาะ section ที่เปิด — ถ้า render พร้อมกันจะยิง query รายการซ้ำทุกสถานะทุกครั้งที่เข้าหน้า
 * - ?edit=<id> → แทนที่ทั้งหน้าด้วยหน้าแก้ไขบทความเต็มหน้า (กด back ของเบราว์เซอร์ = ออกจากโหมดแก้)
 * @dependencies
 * - useSeoArticleSection, useSeoArticleEditParam (nuqs), useQueueSeoArticleJob, useWatchSeoArticleJobs,
 *   PageSectionSidebar
 * @related
 * - รายการบทความ: {@link seo-article-list-section.tsx}
 * - ภาพรวม: {@link seo-article-overview-section.tsx}
 * - ผลบน Google: {@link seo-article-metrics-section.tsx}
 */
export const SeoArticleHubMain = () => {
  const [section, setSection] = useSeoArticleSection();
  const [editArticleId, setEditArticleId] = useSeoArticleEditParam();
  const { openCategory } = useSeoArticleNavigation();
  const openCategoryDialog = () => {
    useSeoArticleCategoryGenerateStore.getState().reset();
    void openCategory();
  };

  // เฝ้าคิวที่ระดับหน้า — ทุกงานที่จบ (รวมงานที่หน้าแก้ไขสั่งไว้แล้วกด back ออกมา) sync cache ผ่านจุดนี้จุดเดียว
  const jobs = useWatchSeoArticleJobs();

  const listStatus = SEO_ARTICLE_SECTION_STATUS[section];

  // โหมดแก้ไข = หน้าเต็ม แทนที่ทั้งหน้า hub (ไม่ใช่ dialog ซ้อน — โปรแกรมแก้ไขมี popup ของตัวเองที่ชนกับ focus trap)
  if (editArticleId != null) {
    return <SeoArticleEditorPage seoArticleId={editArticleId} onClose={() => void setEditArticleId(null)} />;
  }

  return (
    // -m-2 ทะลุ padding การ์ดขาวของ layout → พื้นหลังหน้าเป็นสีเทา แล้วแต่ละ section เป็นการ์ดขาวลอย
    <div className="-m-2 flex h-[calc(100dvh-50px)] flex-col gap-3 overflow-hidden rounded-sm bg-muted p-2 md:p-4">
      {/* ===== Section: Header ===== */}
      <Card className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-3 md:p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold md:text-xl">บทความ SEO</h1>
            <p className="text-xs text-muted-foreground md:text-sm">
              ให้ AI เขียนบทความจากหมวดสินค้าหรือโจทย์ที่พิมพ์เอง — รีวิวก่อนเผยแพร่ขึ้น /blog และดูผลจาก Google Search Console
            </p>
          </div>
        </div>

        {/* ปุ่ม action หลักของ section ที่เลือกอยู่
            — section ผลบน Google ไม่มี action, section หน้า ถาม-ตอบ มีปุ่มของตัวเองในการ์ดข้างล่าง
              (ถ้าโชว์ปุ่มเขียนบทความคู่กัน คนจะกดผิดปุ่มเพราะทั้งคู่ขึ้นต้นว่า "สร้าง/ให้ AI") */}
        {section !== "metrics" && section !== "faq" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* สั่งเขียน = ปุ่มหลัก; ชุดอ้างอิงภาพใช้กำหนดหน้าตารูปที่ AI วาด */}
            <Button onClick={openCategoryDialog} className="gap-1.5">
              <Wand2 className="h-4 w-4" />
              สร้างบทความ
            </Button>

            <Button variant="outline" asChild className="gap-1.5">
              <Link href="/backoffice/seo/brand/">
                <ImageIcon className="h-4 w-4" />
                ชุดอ้างอิงภาพ AI
              </Link>
            </Button>
          </div>
        )}
      </Card>

      {/* ===== Section: สถานะคิวเขียนบทความ (ไม่มีงานค้าง = ไม่ render) ===== */}
      <SeoArticleJobStatusBar />

      {/* ===== Section: Sidebar + Content ===== */}
      <div className="grid min-h-0 flex-1 grid-cols-[130px_1fr] gap-3 sm:grid-cols-[220px_1fr] lg:grid-cols-[300px_1fr] lg:gap-4">
        <div className="min-h-0">
          <PageSectionSidebar
            items={SEO_ARTICLE_SECTION_ITEMS}
            activeId={section}
            onSelect={(id) => setSection(id as SeoArticleSectionKey)}
            title="หมวดหมู่"
            titleIcon={Newspaper}
          />
        </div>

        {/* คอลัมน์ขวา scroll ในตัว — section ลูก render การ์ดขาวของตัวเองหลายใบ จึงไม่ครอบ Card ซ้ำ */}
        <div className="min-h-0 min-w-0 overflow-y-auto pr-0.5">
          {section === "overview" && <SeoArticleOverviewSection onGoToSection={setSection} />}
          {section === "faq" && <AskAnswerFaqSection jobs={jobs} />}
          {section === "metrics" && <SeoArticleMetricsSection />}
          {listStatus != null && <SeoArticleListSection key={section} status={listStatus} />}
        </div>
      </div>

      <SeoArticleCategoryGenerateDialog />
      <SeoArticleReviewDialog />
    </div>
  );
};
