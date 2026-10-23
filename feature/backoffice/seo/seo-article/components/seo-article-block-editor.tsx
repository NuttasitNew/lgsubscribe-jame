"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
// ต้อง import หลัง style.css ของ BlockNote เสมอ — ไฟล์นี้เขียนทับขนาดหัวข้อให้เท่าเว็บจริง
import "./seo-article-document.css";

import React, { useEffect, useState } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { autoPlacement, offset, shift, size, type Middleware } from "@floating-ui/react";
import { convertSeoBlocksToEditor, type EditorBlock } from "@/lib/seo/helper/convert-seo-blocks-to-editor";
import { convertEditorToSeoBlocks } from "@/lib/seo/helper/convert-editor-to-seo-blocks";
import type { SeoArticleBlock } from "../type/seo-article-block.type";
import { seoArticleEditorSchema } from "./seo-article-editor-schema";
import { getSeoArticleSlashMenuItems } from "./seo-article-slash-menu-items";

/** ระยะห่างขอบจอที่เมนู "/" ต้องเหลือไว้ (ค่าเดียวกับที่ BlockNote ใช้) */
const MENU_VIEWPORT_PADDING = 10;

/**
 * ล้าง maxHeight ที่รอบก่อนตั้งไว้ ก่อนที่ autoPlacement จะวัดว่าควรเปิดขึ้นบนหรือลงล่าง
 *
 * ⚠️ นี่คือตัวแก้บั๊ก "เมนูถูกบีบเหลือแถวเดียวตอนจอเตี้ย" **ห้ามถอดออก**
 * ลำดับ middleware ของ BlockNote คือ autoPlacement → size โดย size เขียน maxHeight ทิ้งไว้บน element
 * รอบถัดมา autoPlacement จึงวัดเจอเมนูที่ "เตี้ยอยู่แล้ว" เลยสรุปว่าเปิดลงล่างก็พอ → size บีบซ้ำอีก
 * กลายเป็นวงจรล็อกตัวเอง เมนูไม่มีวันสูงพอจะกระตุ้นให้พลิกขึ้นบน
 * พอล้างค่าก่อนวัด autoPlacement จะเห็นความสูงจริงของเมนู (~370px) แล้วพลิกขึ้นบนได้ถูกต้อง
 */
const resetMenuMaxHeight: Middleware = {
  name: "resetMaxHeightBeforeMeasure",
  fn: ({ elements }) => {
    elements.floating.style.maxHeight = "";
    return {};
  },
};

interface SeoArticleBlockEditorProps {
  /** เนื้อหาตั้งต้น — อ่านครั้งเดียวตอน mount (editor เป็น uncontrolled หลังจากนั้น) */
  initialBlocks: SeoArticleBlock[];
  /** ส่ง block ที่แปลงกลับเป็นสเปก v2 แล้วออกไปทุกครั้งที่เนื้อหาเปลี่ยน */
  onChangeAction: (blocks: SeoArticleBlock[]) => void;
}

/**
 * @description โปรแกรมแก้ไขบทความแบบ Notion (BlockNote) ของบทความ SEO
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx} (ผ่าน {@link seo-article-block-editor-client.tsx})
 * @props { initialBlocks: SeoArticleBlock[], onChangeAction: (blocks) => void }
 * @features
 * - พิมพ์ "/" ขึ้นเมนูเลือกบล็อกภาษาไทย (เมนูของเราเอง ไม่ใช่ของ BlockNote — ดู slash-menu-items)
 * - พิมพ์ `## ` `### ` `- ` `1. ` แปลงเป็นบล็อกทันทีระหว่างพิมพ์ (markdown input rule ในตัว BlockNote)
 * - หมุดลากด้านซ้ายของทุกบล็อก (side menu) ลากสลับตำแหน่งได้ทุกชนิด รวมทั้งรูปและตาราง
 * - ตารางมีหมุดเพิ่ม/ลบแถว-คอลัมน์ (tableHandles) และแถบจัดรูปแบบตอนลากคลุมข้อความ
 * - ปิด emoji picker / file panel เพราะสเปกบทความไม่มี block พวกนั้น
 * - ขนาดตัวอักษรหัวข้อ/ย่อหน้าถูกเขียนทับให้เท่าบทความจริงบนเว็บ (h2 = 20px ไม่ใช่ 32px ตาม default)
 *   ดู {@link seo-article-document.css} — เนื้อบทความเริ่มที่ h2 เพราะ h1 คือชื่อบทความบนแถบรูปปก
 * @logic
 * - **uncontrolled โดยตั้งใจ**: ส่ง initialBlocks เข้าครั้งเดียวตอน mount ถ้าเขียนค่ากลับเข้า editor ทุกครั้งที่ state
 *   เปลี่ยน ตำแหน่งเคอร์เซอร์จะเด้งกลับต้นบรรทัดทุกตัวอักษร → ผู้เรียกต้อง remount ด้วย key เมื่อเปลี่ยนบทความ
 * - แปลงเอกสารกลับเป็นสเปก v2 ทุกครั้งที่ onChange เพื่อให้ปุ่มบันทึกเทียบ "เนื้อหาจริง" ได้ทันที
 * @dependencies @blocknote/core, @blocknote/react, @blocknote/mantine
 * @related
 * - แปลงสองทาง: {@link @/lib/seo/helper/convert-seo-blocks-to-editor}, {@link @/lib/seo/helper/convert-editor-to-seo-blocks}
 */
const SeoArticleBlockEditor = ({ initialBlocks, onChangeAction }: SeoArticleBlockEditorProps) => {
  const editor = useCreateBlockNote({
    schema: seoArticleEditorSchema,
    initialContent: convertSeoBlocksToEditor(initialBlocks) as never,
  });

  /**
   * กล่องรองรับเมนู "/" ที่แขวนไว้ที่ document.body — **คลาสทุกตัวจำเป็น ห้ามตัดออก**
   *
   * สาเหตุจริงของอาการ "เมนูใสจนมองไม่เห็น": ธีมของ BlockNote ผูกกับบรรพบุรุษ 2 ชั้น
   * 1. `.bn-root` เป็นที่ประกาศตัวแปรสีทั้งชุด (`--bn-colors-menu-background: #fff` ฯลฯ)
   * 2. `.bn-mantine` เป็นตัวคัดกรองของกฎที่เอาตัวแปรไปใช้ (`.bn-mantine .bn-menu-dropdown { background-color: ... }`)
   * พอ portal เมนูไปที่ body เปล่า ๆ เมนูหลุดออกนอกทั้งสองคลาส กฎพื้นหลังจึงไม่ทำงานเลย
   * = กล่องใสลอยอยู่ ไม่ใช่เรื่อง z-index หรือ opacity
   *
   * ชุดคลาสนี้ลอกมาจาก element จริงที่ BlockNoteView สร้าง (ยกเว้น bn-container ที่คุม layout ของตัวเอกสาร)
   * ถ้าอัปเกรด BlockNote แล้วเมนูใสอีก ให้ไปดูคลาสของ `.bn-container` ในหน้าจริงแล้วตามมาแก้ที่นี่
   */
  const [menuPortal, setMenuPortal] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const container = document.createElement("div");
    container.className = "bn-root bn-mantine light seo-article-document";
    container.dataset.colorScheme = "light";
    document.body.appendChild(container);
    setMenuPortal(container);
    return () => container.remove();
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      className="seo-article-document"
      theme="light"
      slashMenu={false}
      emojiPicker={false}
      filePanel={false}
      onChange={() => onChangeAction(convertEditorToSeoBlocks(editor.document as unknown as EditorBlock[]))}
    >
      {/* รอให้กล่อง portal ถูกสร้างก่อน — ถ้าปล่อยเป็น null ระหว่างนั้น BlockNote จะแขวนเมนูที่ body เปล่าแล้วเมนูจะใส */}
      {menuPortal && (
        <SuggestionMenuController
          triggerCharacter="/"
          /**
           * portal ออกไปนอกคอลัมน์เอกสาร — **ห้ามเอาออก**
           *
           * ค่าเริ่มต้นของ BlockNote คือ portal ไว้ใน `bn-container` ซึ่งอยู่ในคอลัมน์เอกสารที่เป็น
           * `overflow-y: auto` (ดู seo-article-editor-page.tsx) พอจอเตี้ย คอลัมน์นั้นสูงแค่ ~350px
           * ผลคือ 2 เด้ง: เมนูโดนขอบกรอบตัด และ middleware `size()` ของ BlockNote คำนวณ
           * availableHeight จากกรอบเล็กนั้น แล้วตั้ง maxHeight เหลือเกือบ 0 → เมนูใช้งานไม่ได้เลย
           *
           * พอย้ายออกมาไว้ที่ body แล้ว clipping ancestor เหลือแค่ viewport ทั้ง autoPlacement (พลิกขึ้นบน
           * เมื่อพื้นที่ล่างไม่พอ) และ size() จึงคำนวณจากความสูงจอจริง — ทำงานถูกตามที่ BlockNote ตั้งใจ
           * (BlockNote ผูก contextElement ไว้กับ scroll container อยู่แล้ว เมนูจึงยังเลื่อนตามตอนสกรอลล์)
           */
          portalElement={menuPortal}
          /**
           * ชุด middleware นี้ลอกของ BlockNote มาทั้งชุด เปลี่ยนแค่แทรก resetMenuMaxHeight ไว้ก่อน autoPlacement
           * (ค่าที่ส่งตรงนี้ทับของเดิมทั้งก้อน จึงต้องเขียนครบทุกตัว ไม่งั้น offset/shift/size จะหายไป)
           */
          floatingUIOptions={{
            useFloatingOptions: {
              middleware: [
                offset(MENU_VIEWPORT_PADDING),
                resetMenuMaxHeight,
                autoPlacement({ allowedPlacements: ["bottom-start", "top-start"], padding: MENU_VIEWPORT_PADDING }),
                shift(),
                size({
                  padding: MENU_VIEWPORT_PADDING,
                  apply: ({ elements, availableHeight }) => {
                    elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
                  },
                }),
              ],
            },
          }}
          getItems={async (query) => filterSuggestionItems(getSeoArticleSlashMenuItems(editor), query)}
        />
      )}
    </BlockNoteView>
  );
};

export default SeoArticleBlockEditor;
