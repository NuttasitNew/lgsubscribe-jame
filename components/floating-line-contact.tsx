"use client";

import { useState } from "react";
import { LineMark } from "@/components/line-mark";
import { siteConfig } from "@/lib/site";

export function FloatingLineContact() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  function dismiss() {
    setIsVisible(false);
  }

  return (
    <aside className="fixed bottom-6 right-6 z-[55] hidden select-none lg:block" aria-label="ติดต่อฝ่ายขายทาง LINE">
      <div className="relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="ซ่อนปุ่มติดต่อ LINE"
          className="absolute -right-2 -top-2 z-10 grid size-6 place-items-center rounded-full bg-neutral-700 text-white shadow-md transition-colors hover:bg-neutral-950"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <a
          href={siteConfig.lineUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#06C755] to-[#04a647] py-2 pl-2 pr-4 text-white shadow-[0_4px_16px_rgba(6,199,85,0.42)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#06C755]">
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-white/60 [animation-duration:2.5s]" />
            <LineMark className="relative size-6" />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-bold">สอบถามแพ็กเกจ</span>
            <span className="block text-[11px] text-white/85">ผ่าน LINE ได้ทันที</span>
          </span>
        </a>
      </div>
    </aside>
  );
}
