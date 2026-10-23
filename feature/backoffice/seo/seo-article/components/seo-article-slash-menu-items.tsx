"use client";

import React from "react";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import {
  ChartNoAxesColumn,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Lightbulb,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sparkles,
  Table as TableIcon,
  Text,
  TriangleAlert,
} from "lucide-react";
import type { SeoArticleEditor } from "./seo-article-editor-schema";

/** จำนวนแถว/คอลัมน์ตั้งต้นของตารางที่แทรกจากเมนู (แถวแรกเป็นหัวตาราง) */
const TABLE_ROWS = 3;
const TABLE_COLUMNS = 3;

/** สร้างเนื้อหาตารางเปล่าพร้อมหัวตาราง 1 แถว */
const buildEmptyTableContent = () => ({
  type: "tableContent" as const,
  headerRows: 1,
  rows: Array.from({ length: TABLE_ROWS }, () => ({
    cells: Array.from({ length: TABLE_COLUMNS }, () => [] as never[]),
  })),
});

/**
 * @description รายการเมนูที่ขึ้นเมื่อพิมพ์ "/" ในโปรแกรมแก้ไขบทความ SEO (ภาษาไทยทั้งหมด)
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @logic
 * - **ไม่ใช้เมนูมาตรฐานของ BlockNote** เพราะมันเสนอ block ที่สเปกบทความเก็บไม่ได้ (โค้ด/ไฟล์/วิดีโอ/checklist)
 *   และข้อความเป็นภาษาอังกฤษ — รายการนี้จึงคุมเองให้ตรงกับ 9 ชนิดที่ push ขึ้นเว็บได้จริง
 * - `aliases` ใส่ทั้งคำไทยและอังกฤษ เพราะแอดมินบางคนพิมพ์ "/h2" บางคนพิมพ์ "/หัวข้อ"
 * - แบ่ง group เป็น "ข้อความ" / "รายการ" / "สื่อและกล่อง" ให้เมนูอ่านง่ายตอนมีหลายรายการ
 * @param editor instance ของ editor ที่ผูกกับ {@link seo-article-editor-schema.ts}
 * @returns รายการเมนูพร้อมส่งให้ SuggestionMenuController
 * @used-by {@link seo-article-block-editor.tsx}
 */
export const getSeoArticleSlashMenuItems = (editor: SeoArticleEditor): DefaultReactSuggestionItem[] => [
  {
    title: "ย่อหน้า",
    subtext: "ข้อความปกติ",
    aliases: ["ย่อหน้า", "ข้อความ", "p", "paragraph", "text"],
    group: "ข้อความ",
    icon: <Text className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "paragraph" }),
  },
  {
    title: "หัวข้อใหญ่ (H2)",
    subtext: "หัวข้อหลักของบทความ — พิมพ์ ## แล้วเว้นวรรคก็ได้",
    aliases: ["หัวข้อ", "หัวข้อใหญ่", "h2", "heading"],
    group: "ข้อความ",
    icon: <Heading2 className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level: 2 } }),
  },
  {
    title: "หัวข้อย่อย (H3)",
    subtext: "หัวข้อซ้อนใต้หัวข้อใหญ่ — พิมพ์ ### แล้วเว้นวรรคก็ได้",
    aliases: ["หัวข้อย่อย", "h3", "subheading"],
    group: "ข้อความ",
    icon: <Heading3 className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "heading", props: { level: 3 } }),
  },
  {
    title: "คำพูดยกมา",
    subtext: "ข้อความอ้างอิง เช่น เสียงจากลูกค้า",
    aliases: ["คำพูด", "อ้างอิง", "quote", "blockquote"],
    group: "ข้อความ",
    icon: <Quote className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "quote" }),
  },
  {
    title: "รายการจุด",
    subtext: "หัวข้อย่อยแบบจุด — พิมพ์ - แล้วเว้นวรรคก็ได้",
    aliases: ["รายการ", "จุด", "bullet", "ul", "list"],
    group: "รายการ",
    icon: <List className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "bulletListItem" }),
  },
  {
    title: "รายการตัวเลข",
    subtext: "ขั้นตอน 1-2-3 — พิมพ์ 1. แล้วเว้นวรรคก็ได้",
    aliases: ["ลำดับ", "ตัวเลข", "ขั้นตอน", "number", "ol"],
    group: "รายการ",
    icon: <ListOrdered className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "numberedListItem" }),
  },
  {
    title: "รูปภาพ",
    subtext: "อัปรูปจากเครื่อง แล้วกรอกคำอธิบายรูป (บังคับ)",
    aliases: ["รูป", "ภาพ", "image", "img", "upload", "อัป"],
    group: "สื่อและกล่อง",
    icon: <ImageIcon className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "seoImage" }),
  },
  {
    // แทรกแล้ว **เริ่มวาดทันที** — AI อ่านหัวข้อกับเนื้อความรอบ ๆ แล้วคิดเองว่าควรเป็นภาพอะไร
    title: "ภาพถ่าย AI (วาดตามบทความ)",
    subtext: "AI อ่านหัวข้อนี้แล้ววาดภาพถ่ายสไตล์แบรนด์ให้ — กดแล้วเริ่มวาดทันที",
    // "ai-pic" เป็นคำที่แสดงในแผงวิธีพิมพ์ ต้องมีเสมอ — ที่เหลือเป็นทางลัดสำรองให้คนที่พิมพ์แบบอื่น
    aliases: ["ai-pic", "aipic", "ai", "เอไอ", "ภาพเอไอ", "รูปเอไอ", "วาด", "photo", "generate"],
    group: "สื่อและกล่อง",
    icon: <Sparkles className="size-4" />,
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, { type: "seoImage", props: { aiStyle: "photo" } } as never),
  },
  {
    // แทรกแล้ว **เริ่มวาดทันที** ไม่ต้องกดต่อ — prop aiStyle เป็นคำใบ้ชั่วคราว ไม่ถูกบันทึกลงบทความ
    title: "อินโฟกราฟิก (AI วาดให้เลย)",
    subtext: "แผนภาพสรุปหัวข้อนี้ พร้อมตัวหนังสือไทยในภาพ — กดแล้ว AI เริ่มวาดทันที",
    // "ai-info" เป็นคำที่แสดงในแผงวิธีพิมพ์ ต้องมีเสมอ — ที่เหลือเป็นทางลัดสำรองให้คนที่พิมพ์แบบอื่น
    aliases: ["ai-info", "aiinfo", "อินโฟ", "อินโฟกราฟิก", "แผนภาพ", "infographic", "info", "chart"],
    group: "สื่อและกล่อง",
    icon: <ChartNoAxesColumn className="size-4" />,
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, { type: "seoImage", props: { aiStyle: "infographic" } } as never),
  },
  {
    title: "ตาราง",
    subtext: "ตารางเปรียบเทียบ 3x3 พร้อมหัวตาราง",
    aliases: ["ตาราง", "เปรียบเทียบ", "table"],
    group: "สื่อและกล่อง",
    icon: <TableIcon className="size-4" />,
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, { type: "table", content: buildEmptyTableContent() } as never),
  },
  {
    title: "เส้นคั่น",
    subtext: "ขีดคั่นระหว่างหัวข้อ",
    aliases: ["เส้น", "คั่น", "divider", "hr"],
    group: "สื่อและกล่อง",
    icon: <Minus className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "divider" }),
  },
  {
    title: "กล่องเคล็ดลับ",
    subtext: "กล่องสีเขียว เน้นทริกที่อยากให้จำ",
    aliases: ["เคล็ดลับ", "ทริก", "tip", "callout"],
    group: "สื่อและกล่อง",
    icon: <Lightbulb className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout", props: { variant: "tip" } }),
  },
  {
    title: "กล่องข้อควรระวัง",
    subtext: "กล่องสีเหลือง เตือนสิ่งที่ห้ามทำ",
    aliases: ["เตือน", "ระวัง", "warn", "warning", "callout"],
    group: "สื่อและกล่อง",
    icon: <TriangleAlert className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout", props: { variant: "warn" } }),
  },
  {
    title: "กล่องข้อมูลเพิ่มเติม",
    subtext: "กล่องสีฟ้า ใส่ข้อมูลเสริม",
    aliases: ["ข้อมูล", "info", "note", "callout"],
    group: "สื่อและกล่อง",
    icon: <Info className="size-4" />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout", props: { variant: "info" } }),
  },
];
