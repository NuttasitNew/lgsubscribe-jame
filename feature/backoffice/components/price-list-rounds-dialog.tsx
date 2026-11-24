"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** "ดู N รอบ" in the code stats table: that code's rounds in a dialog (list rendered on the server). */
export function PriceListRoundsDialog({
  code,
  label,
  rounds,
  children,
}: {
  code: string;
  label: string;
  rounds: number;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        ดู {rounds.toLocaleString("th-TH")} รอบ
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 text-left">
        <div className="border-b border-[#d4d7da] px-5 py-4 pr-12">
          <DialogTitle className="text-base">
            กิจกรรมของรหัส {code}
            {label ? ` · ${label}` : ""}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            {rounds.toLocaleString("th-TH")} รอบ ล่าสุดอยู่บน (กางไว้ให้แล้ว) · กดแต่ละรอบเพื่อดูทีละขั้น
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
