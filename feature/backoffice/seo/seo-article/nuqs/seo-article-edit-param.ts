"use client";

import { useSeoArticleNavigation } from "./seo-article-navigation-param";

/**
 * @description nuqs param เปิดหน้าแก้ไขบทความแบบเต็มหน้า (?edit=<seoArticleId>)
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @parent {@link seo-article-hub-main.tsx}
 * @features
 * - ค่า null = ไม่ได้แก้อยู่ (แสดงรายการบทความตามปกติ), ค่าเป็นตัวเลข = แก้บทความนั้นเต็มหน้า
 * - เปิดเป็น "หน้า" ไม่ใช่ dialog เพราะโปรแกรมแก้ไขบล็อกมี popup ของตัวเอง (เมนู /, toolbar, ตัวลาก)
 *   ถ้าอยู่ใน dialog จะชนกับ focus trap ของ dialog จนพิมพ์ในเมนูไม่ได้
 * - history: "push" → กดปุ่ม back ของเบราว์เซอร์ = ออกจากหน้าแก้ไข และแชร์ลิงก์หน้าแก้ไขได้
 * @dependencies nuqs
 * @related {@link ../components/seo-article-editor-page.tsx}
 */
export const useSeoArticleEditParam = () => {
  const { edit, setEdit } = useSeoArticleNavigation();
  return [edit, setEdit] as const;
};
