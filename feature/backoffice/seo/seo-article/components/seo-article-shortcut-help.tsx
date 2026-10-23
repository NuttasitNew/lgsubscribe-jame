"use client";

import React from "react";
import { Sparkles } from "lucide-react";

/**
 * วิธีพิมพ์ลัดที่ใช้ได้จริงในโปรแกรมแก้ไข
 *
 * ⚠️ ทุกบรรทัดต้องตรงกับสิ่งที่ BlockNote ทำได้จริง **ห้ามเขียนเผื่อ**
 * ถ้าใส่คำสั่งที่ไม่มีจริง ผู้ใช้จะพิมพ์แล้วไม่เกิดอะไรขึ้นและเข้าใจว่าโปรแกรมพัง
 * ถ้าเพิ่มชนิดบล็อกใหม่ ต้องมาเติมที่นี่ด้วย (ดู seo-article-slash-menu-items.tsx)
 *
 * หมายเหตุ h1: schema จำกัดหัวข้อไว้ที่ระดับ 2-3 เท่านั้น (`# ` จึงไม่ทำงาน)
 * เพราะ h1 คือชื่อบทความบนแถบรูปปก ซึ่งแก้ที่ช่องชื่อด้านบน ไม่ใช่ในเนื้อหา
 */
const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "## ", label: "หัวข้อใหญ่ (H2)" },
  { keys: "### ", label: "หัวข้อย่อย (H3)" },
  { keys: "- ", label: "รายการจุด" },
  { keys: "1. ", label: "รายการตัวเลข" },
  { keys: "> ", label: "คำพูดยกมา" },
  { keys: "/", label: "เมนูรวมทุกชนิด (รูป ตาราง กล่อง เส้นคั่น)" },
];

/**
 * คำสั่งให้ AI วาดรูป — แยกกลุ่มเพราะ**เสียเงินจริงต่อการกด 1 ครั้ง** (ราว 0.05 USD ต่อภาพ)
 * ทั้งสองคำสั่งเริ่มวาดทันทีที่กด ไม่มีหน้ายืนยัน จึงต้องเขียนกำกับให้ชัดว่ากดแล้ววาดเลย
 */
const AI_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "/ai-pic", label: "ภาพถ่ายตามเนื้อหาหัวข้อนั้น — AI คิดเองว่าควรวาดอะไร" },
  { keys: "/ai-info", label: "อินโฟกราฟิกสรุปหัวข้อ พร้อมตัวหนังสือไทยในภาพ" },
];

/**
 * @description แผงบอกวิธีพิมพ์ลัดของโปรแกรมแก้ไขบทความ — แทนปุ่ม "+" ที่ถูกตัดออกไป
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx}
 * @features
 * - คาไว้ที่คอลัมน์ขวาตลอดเวลา ไม่ต้องชี้เมาส์หรือกดอะไรก่อนถึงจะเห็น
 *   (ต่างจาก tooltip ที่ต้องไปเจอปุ่มก่อน ซึ่งขัดกับเหตุผลที่ตัดปุ่มออก)
 * - เรียงจากที่ใช้บ่อยสุดลงไป: หัวข้อ → รายการ → อื่น ๆ
 * @related {@link seo-article-block-editor.tsx} (จุดที่ตัดปุ่ม "+" ออก)
 */
export const SeoArticleShortcutHelp = () => (
  <div className="flex flex-col gap-1.5">
    {SHORTCUTS.map((shortcut) => (
      <div key={shortcut.keys} className="flex items-center gap-2 text-xs">
        <kbd className="shrink-0 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
          {shortcut.keys.trimEnd() || shortcut.keys}
        </kbd>
        <span className="text-muted-foreground">{shortcut.label}</span>
      </div>
    ))}

    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
      พิมพ์ที่ต้นบรรทัดแล้วเว้นวรรค · ลากหมุดซ้ายของบล็อกเพื่อสลับตำแหน่ง
    </p>

    <div className="mt-3 border-t pt-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
        <Sparkles className="size-3.5 text-amber-500" />
        ให้ AI วาดรูป (กดแล้ววาดเลย)
      </p>
      {AI_SHORTCUTS.map((shortcut) => (
        <div key={shortcut.keys} className="flex items-start gap-2 py-0.5 text-xs">
          <kbd className="mt-px shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-800">
            {shortcut.keys}
          </kbd>
          <span className="leading-relaxed text-muted-foreground">{shortcut.label}</span>
        </div>
      ))}
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        พิมพ์คำสั่งเองได้ก่อนกดวาด · ปล่อยว่าง = AI อ่านหัวข้อกับเนื้อความรอบ ๆ แล้วคิดให้
      </p>
    </div>
  </div>
);
