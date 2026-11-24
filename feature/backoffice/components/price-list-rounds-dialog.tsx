"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * "ดูรายละเอียด" in the code stats table: one code's history in a dialog, switching between
 * when it signed in / opened the page and what was chosen in each round (both rendered on the server).
 */
export function PriceListRoundsDialog({
  code,
  label,
  visits,
  rounds,
  visitList,
  roundList,
}: {
  code: string;
  label: string;
  visits: number;
  rounds: number;
  visitList: ReactNode;
  roundList: ReactNode;
}) {
  const [view, setView] = useState<"rounds" | "visits">(rounds > 0 ? "rounds" : "visits");
  const tabs = [
    { value: "rounds", label: `รายการที่เลือก (${rounds.toLocaleString("th-TH")} รอบ)` },
    { value: "visits", label: `เข้าใช้ (${visits.toLocaleString("th-TH")} ครั้ง)` },
  ] as const;
  return (
    <Dialog>
      <DialogTrigger className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        ดูรายละเอียด
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 text-left">
        <div className="space-y-3 border-b border-[#d4d7da] px-5 py-4 pr-12">
          <div>
            <DialogTitle className="text-base">
              รายละเอียดรหัส {code}
              {label ? ` · ${label}` : ""}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {view === "rounds"
                ? "แต่ละรอบลูกค้า ล่าสุดอยู่บน (กางไว้ให้แล้ว) · กดรอบอื่นเพื่อดูทีละขั้น"
                : "ทุกครั้งที่ใส่รหัสและเปิดหน้าราคา ล่าสุดอยู่บน"}
            </DialogDescription>
          </div>
          <div role="tablist" aria-label="มุมมอง" className="inline-flex gap-1 rounded-lg bg-[#eef0f2] p-1">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={view === t.value}
                onClick={() => setView(t.value)}
                className={cn(
                  "h-9 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === t.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-[#666b70] hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{view === "rounds" ? roundList : visitList}</div>
      </DialogContent>
    </Dialog>
  );
}
