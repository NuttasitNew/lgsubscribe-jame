"use client";

import React from "react";
import { SeoArticleStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { useSeoArticleNavigation } from "../nuqs/seo-article-navigation-param";
import type { SeoArticleListItem } from "../server/find-seo-articles.action";
import type { SeoSourceTopic } from "../type/seo-article-content.type";

const STATUS_BADGE: Record<SeoArticleStatus, { label: string; className: string }> = {
  DRAFT: { label: "รอรีวิว", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "อนุมัติแล้ว", className: "bg-blue-100 text-blue-700" },
  PUBLISHED: { label: "เผยแพร่แล้ว", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "ปัดตก", className: "bg-gray-200 text-gray-600" },
};

/**
 * @description การ์ดบทความ SEO ในหน้ารายการ — คลิกเปิด dialog รีวิว
 * @page /super-admin/hurry-web/seo-article
 * @parent {@link seo-article-list-section.tsx}
 * @access super-admin
 * @props { article: SeoArticleListItem } — แถวจากหน้ารายการ (ไม่มี contentJson โดยตั้งใจ)
 * @dependencies
 * - useSeoArticleNavigation: เปิด dialog
 */
export const SeoArticleCard = ({ article }: { article: SeoArticleListItem }) => {
  const { openReview: openDialog } = useSeoArticleNavigation();
  const badge = STATUS_BADGE[article.status];
  const topics = (article.sourceTopics as unknown as SeoSourceTopic[]) || [];

  return (
    <button
      onClick={() => openDialog(article.seoArticleId)}
      className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge className={badge.className}>{badge.label}</Badge>
        <span className="text-xs text-gray-400">{article.sourceDate}</span>
      </div>
      <strong className="line-clamp-2">{article.title}</strong>
      <p className="line-clamp-2 text-sm text-gray-500">{article.metaDescription}</p>
      {topics[0] && (
        <p className="text-xs text-gray-400">
          ลูกค้าถาม: {topics[0].topic} ({topics[0].count} ครั้ง)
        </p>
      )}
      <span className="text-xs text-gray-400">/blog/{article.slug}</span>
    </button>
  );
};
