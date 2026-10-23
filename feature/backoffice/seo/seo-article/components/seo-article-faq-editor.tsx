"use client";

import React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeoArticleEditorStore } from "../zustand/seo-article-editor.store";
import type { SeoArticleFaq } from "../type/seo-article-content.type";
import { SeoArticleAutoGrowTextarea } from "./seo-article-auto-grow-textarea";

/**
 * ความสูงต่ำสุดของช่องคำตอบ (px) ≈ 2 บรรทัด — แค่กันช่องแบนตอนยังไม่มีข้อความเท่านั้น
 * ห้ามตั้งสูงกว่านี้: ช่องนี้ยืดตามเนื้อหาเองอยู่แล้ว ({@link SeoArticleAutoGrowTextarea})
 * ค่าสูง ๆ จะกลายเป็นช่องว่างตายใต้คำตอบสั้น ทำให้ FAQ ดูห่างกันผิดปกติ
 */
const ANSWER_MIN_HEIGHT_PX = 52;

/**
 * @description ส่วนคำถามที่พบบ่อยท้ายบทความ — อยู่ในผืนเอกสารเดียวกับเนื้อหา ตำแหน่งเดียวกับที่ผู้อ่านเห็นบนเว็บ
 * @page /super-admin/hurry-web/seo-article?edit=<id>
 * @access super-admin
 * @parent {@link seo-article-editor-page.tsx}
 * @features
 * - หัวข้อ "คำถามที่พบบ่อย" เป็น h2 สไตล์เดียวกับหัวข้อในบทความ (text-xl font-bold text-gray-900)
 * - ไม่มีกรอบการ์ดรายข้อ — คำถาม/คำตอบดูเป็นข้อความจริงเรียงกัน คลิกแล้วพิมพ์ทับได้เลย
 * - ช่องคำตอบเต็มความกว้างคอลัมน์ + ยืดตามเนื้อหา (ไม่ต่ำกว่า ~5 บรรทัด) จะได้อ่านครบและแก้ง่าย
 * - ปุ่มเลื่อนขึ้น-ลง/ลบ จางไว้ โผล่ตอนเอาเมาส์ชี้ข้อนั้น (จอสัมผัสแสดงตลอด) ไม่แย่งสายตาจากเนื้อหา
 * - คำตอบเป็น **ข้อความล้วนเท่านั้น** ห้ามมี HTML เพราะค่านี้ถูกยัดลง FAQPage JSON-LD ตรง ๆ
 *   ถ้ามี tag ปน Google จะอ่าน schema ไม่ผ่านและอาจโดนตัด rich result ทิ้ง
 * - FAQ ที่กรอกไม่ครบ (มีแค่คำถามหรือแค่คำตอบ) จะถูกกันไว้ที่ปุ่มบันทึกของหน้า [SEO-EDT-36]
 * @dependencies useSeoArticleEditorStore (selector ทีละ field ตามกฎ ห้าม destructure ทั้ง store)
 * @related หน้าจริงบนเว็บ: hurry-web `app/[locale]/blog/_components/dynamic-article-content.tsx`
 */
export const SeoArticleFaqEditor = () => {
  const faq = useSeoArticleEditorStore((state) => state.draft?.content.faq);
  const setFaq = useSeoArticleEditorStore((state) => state.setFaq);

  const items: SeoArticleFaq[] = faq ?? [];

  /** เขียนทับรายการทั้งชุด — FAQ มีไม่กี่ข้อ การ copy ทั้ง array ถูกกว่าการทำ action แยกรายข้อ */
  const replaceItems = (next: SeoArticleFaq[]) => setFaq(next);

  const updateItem = (index: number, patch: Partial<SeoArticleFaq>) =>
    replaceItems(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    replaceItems(next);
  };

  return (
    <section className="flex flex-col">
      {/* ไม่มีคำอธิบายค้างใต้หัวข้อ — ผืนนี้ต้องอ่านเหมือนบทความจริง ข้อความสอนวิธีใช้ทำให้หลงว่าเป็นเนื้อหา
          กฎ "ห้ามใส่ HTML" ย้ายไปอยู่ที่ placeholder ของช่องคำตอบแทน (เห็นตอนกำลังพิมพ์คำตอบใหม่) */}
      <h2 className="mb-2 mt-6 text-xl font-bold text-gray-900">คำถามที่พบบ่อย</h2>

      {items.length === 0 && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          ยังไม่มีคำถาม — บทความที่มี FAQ มีโอกาสได้พื้นที่แสดงผลเพิ่มบนหน้าค้นหาของ Google
        </p>
      )}

      {items.map((item, index) => (
        <div key={index} className="group relative border-b border-gray-100 py-2 last:border-0">
          <SeoArticleAutoGrowTextarea
            value={item.question}
            onValueChangeAction={(value) => updateItem(index, { question: value })}
            placeholder={`คำถามข้อที่ ${index + 1} — คำถามที่ลูกค้าถามบ่อย`}
            aria-label={`คำถามข้อที่ ${index + 1}`}
            className="pr-28 text-base font-semibold leading-relaxed text-gray-900"
          />
          <SeoArticleAutoGrowTextarea
            value={item.answer}
            onValueChangeAction={(value) => updateItem(index, { answer: value })}
            minHeightPx={ANSWER_MIN_HEIGHT_PX}
            placeholder="คำตอบ (ข้อความล้วน ห้ามใส่ HTML)"
            aria-label={`คำตอบข้อที่ ${index + 1}`}
            className="mt-0.5 text-base leading-relaxed text-gray-600"
          />

          <div className="absolute right-0 top-2 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-60">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              title="เลื่อนขึ้น"
              disabled={index === 0}
              onClick={() => moveItem(index, -1)}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              title="เลื่อนลง"
              disabled={index === items.length - 1}
              onClick={() => moveItem(index, 1)}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              title="ลบคำถามข้อนี้"
              onClick={() => replaceItems(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3 w-fit gap-1.5 text-muted-foreground"
        onClick={() => replaceItems([...items, { question: "", answer: "" }])}
      >
        <Plus className="size-3.5" />
        เพิ่มคำถาม
      </Button>
    </section>
  );
};
