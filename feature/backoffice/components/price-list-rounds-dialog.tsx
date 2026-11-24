"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KeyRound, ListChecks, LogIn } from "lucide-react";
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
  devices = 0,
  visitList,
  roundList,
}: {
  code: string;
  label: string;
  visits: number;
  rounds: number;
  devices?: number;
  visitList: ReactNode;
  roundList: ReactNode;
}) {
  const [view, setView] = useState<"rounds" | "visits">(rounds > 0 ? "rounds" : "visits");
  const tabs = [
    { value: "rounds", label: "รายการที่เลือก", count: `${rounds.toLocaleString("th-TH")} รอบ`, Icon: ListChecks },
    {
      value: "visits",
      label: "เข้าใช้",
      count: `${visits.toLocaleString("th-TH")} ครั้ง${devices ? ` · ${devices} เครื่อง` : ""}`,
      Icon: LogIn,
    },
  ] as const;
  return (
    <Dialog>
      <DialogTrigger className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        ดูรายละเอียด
      </DialogTrigger>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 text-left">
        <div className="space-y-4 border-b border-[#e1e3e6] bg-gradient-to-b from-[#f8f9fa] to-white px-5 pb-4 pt-5 pr-12">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
                รหัส <span className="rounded-md bg-white px-2 py-0.5 font-mono text-base ring-1 ring-[#e1e3e6]">{code}</span>
                {label && <span className="text-base font-normal text-[#666b70]">{label}</span>}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {view === "rounds"
                  ? "แต่ละรอบที่พนักงานคุยกับลูกค้า ล่าสุดอยู่บน · กดการ์ดเพื่อดูทีละขั้น"
                  : "ทุกครั้งที่ใส่รหัสและเปิดหน้าราคา แยกตามเครื่องที่ใช้"}
              </DialogDescription>
            </div>
          </div>
          <div role="tablist" aria-label="มุมมอง" className="grid grid-cols-2 gap-1 rounded-xl bg-[#eef0f2] p-1 sm:inline-grid">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={view === t.value}
                onClick={() => setView(t.value)}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === t.value ? "bg-white text-foreground shadow-sm" : "text-[#666b70] hover:text-foreground",
                )}
              >
                <t.Icon className="size-4" aria-hidden />
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                    view === t.value ? "bg-primary/10 text-primary" : "bg-white/70 text-[#666b70]",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f6f7]">{view === "rounds" ? roundList : visitList}</div>
      </DialogContent>
    </Dialog>
  );
}
