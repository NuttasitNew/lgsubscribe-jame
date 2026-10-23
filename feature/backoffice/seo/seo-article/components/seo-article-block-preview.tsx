"use client";

import React from "react";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeoArticleBlock, SeoArticleCalloutVariant, SeoArticleTextRun } from "../type/seo-article-block.type";

/** สีและไอคอนของ callout ตอนพรีวิว (ให้ตรงกับตอนแก้ไข) */
const CALLOUT_UI: Record<SeoArticleCalloutVariant, { icon: typeof Info; box: string; color: string }> = {
  tip: { icon: Lightbulb, box: "border-emerald-200 bg-emerald-50", color: "text-emerald-600" },
  warn: { icon: TriangleAlert, box: "border-amber-200 bg-amber-50", color: "text-amber-600" },
  info: { icon: Info, box: "border-sky-200 bg-sky-50", color: "text-sky-600" },
};

/** แสดง rich-text run — ข้อความเป็น plain text เสมอ จึง render เป็น text node ปกติ (ไม่มี dangerouslySetInnerHTML) */
const RunText = ({ runs }: { runs: SeoArticleTextRun[] }) => (
  <>
    {runs.map((run, index) => {
      const content = (
        <span key={index} className={cn(run.bold && "font-semibold", run.italic && "italic")}>
          {run.text}
        </span>
      );

      if (!run.link) return content;
      return (
        <a key={index} href={run.link} className="text-primary underline" target="_blank" rel="noreferrer">
          {content}
        </a>
      );
    })}
  </>
);

/**
 * @description พรีวิวบทความโครงบล็อก (v2) แบบอ่านอย่างเดียว — ใช้ใน dialog รีวิวก่อนเผยแพร่
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @parent {@link seo-article-review-dialog.tsx}
 * @props { blocks: SeoArticleBlock[] }
 * @features
 * - render ครบทั้ง 9 ชนิดบล็อกตามสเปก v2
 * - **ไม่มี dangerouslySetInnerHTML เลย** เพราะ run เป็นข้อความล้วน — ตัดช่องทาง XSS จากเนื้อหาที่ AI เขียนออกทั้งเส้น
 * @related {@link ../type/seo-article-block.type.ts}
 */
export const SeoArticleBlockPreview = ({ blocks }: { blocks: SeoArticleBlock[] }) => (
  <div className="flex flex-col gap-2 text-sm">
    {blocks.map((block) => {
      switch (block.type) {
        case "heading":
          return (
            <h2 key={block.id} className={cn("font-bold", block.level === 2 ? "text-base" : "text-sm")}>
              <RunText runs={block.runs} />
            </h2>
          );

        case "paragraph":
          return (
            <p key={block.id} className="leading-relaxed text-gray-600">
              <RunText runs={block.runs} />
            </p>
          );

        case "bulletList":
          return (
            <ul key={block.id} className="list-disc pl-5 text-gray-600">
              {block.items.map((item, index) => (
                <li key={index}>
                  <RunText runs={item.runs} />
                </li>
              ))}
            </ul>
          );

        case "numberedList":
          return (
            <ol key={block.id} className="list-decimal pl-5 text-gray-600">
              {block.items.map((item, index) => (
                <li key={index}>
                  <RunText runs={item.runs} />
                </li>
              ))}
            </ol>
          );

        case "image":
          return (
            <figure key={block.id} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.url} alt={block.alt} className="w-full rounded-lg object-cover" />
              {block.caption && <figcaption className="text-xs text-muted-foreground">{block.caption}</figcaption>}
            </figure>
          );

        case "table":
          return (
            <div key={block.id} className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.cells.map((cell, cellIndex) => (
                        <td key={cellIndex} className={cn("border p-1.5", cell.isHeader && "bg-muted font-medium")}>
                          <RunText runs={cell.runs} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

        case "quote":
          return (
            <blockquote key={block.id} className="border-l-4 pl-3 italic text-gray-600">
              <RunText runs={block.runs} />
            </blockquote>
          );

        case "divider":
          return <hr key={block.id} className="my-1" />;

        case "callout": {
          const ui = CALLOUT_UI[block.variant] ?? CALLOUT_UI.tip;
          const Icon = ui.icon;
          return (
            <div key={block.id} className={cn("flex gap-2 rounded-lg border p-3", ui.box)}>
              <Icon className={cn("mt-0.5 size-4 shrink-0", ui.color)} />
              <p className="text-gray-700">
                <RunText runs={block.runs} />
              </p>
            </div>
          );
        }
      }
    })}
  </div>
);
