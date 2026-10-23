"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { SEO_ARTICLE_SECTIONS } from "../type/seo-article-section.type";

/**
 * @description nuqs param เลือก section ของหน้า hub "บทความ SEO" (?section=)
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @parent {@link seo-article-hub-main.tsx}
 * @features
 * - section=overview  → ภาพรวม สรุปสถานะ + หัวข้อที่ลูกค้าถาม (ค่าเริ่มต้น)
 * - section=draft     → รายการร่างรอรีวิว
 * - section=published → รายการที่เผยแพร่แล้ว
 * - section=rejected  → รายการที่ปัดตก
 * - section=all       → รายการทุกสถานะ
 * - section=metrics   → ผลบน Google (GSC) ต่อบทความ
 * - history: "push" → กด back/forward และแชร์ลิงก์ได้
 * @dependencies
 * - SEO_ARTICLE_SECTIONS: key ของ section มาจาก type file ที่เดียว — ห้าม hardcode ซ้ำที่นี่
 */
export const useSeoArticleSection = () =>
  useQueryState(
    "section",
    parseAsStringLiteral(SEO_ARTICLE_SECTIONS).withDefault("overview").withOptions({
      history: "push",
      shallow: true,
    })
  );
