"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, UserPlus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComboPromotion } from "@/lib/price-list";

export type CustomerType = ComboPromotion["customer"];

export const CUSTOMER_TYPES: Record<CustomerType, { label: string; hint: string; Icon: typeof UserPlus }> = {
  new: { label: "ลูกค้าใหม่", hint: "ยังไม่เคยมีสัญญา LG Subscribe", Icon: UserPlus },
  existing: { label: "ลูกค้าเดิม", hint: "มีสัญญา LG Subscribe อยู่แล้ว (ซื้อเพิ่ม)", Icon: UserRound },
};

/** Header "profile" chip: who the quote is for. Tapping it reopens the chooser. */
export function CustomerBadge({ customer, onClick }: { customer: CustomerType | null; onClick: () => void }) {
  const info = customer ? CUSTOMER_TYPES[customer] : null;
  const Icon = info?.Icon ?? UserRound;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={info ? `ประเภทลูกค้า: ${info.label} (แตะเพื่อเปลี่ยน)` : "เลือกประเภทลูกค้า"}
      className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-white pl-1 pr-2 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3"
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          customer === "existing" ? "bg-sky-100 text-sky-700" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="hidden text-left leading-tight min-[400px]:block">
        <span className="block text-[11px] text-muted-foreground">ลูกค้า</span>
        <span className="block text-sm font-bold">{info ? info.label.replace("ลูกค้า", "") : "เลือก"}</span>
      </span>
      <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
    </button>
  );
}

/** First screen (and switcher): new or existing customer decides which combo rule applies. */
export function CustomerChooser({
  open,
  customer,
  onChoose,
  onOpenChange,
  accessCode,
}: {
  open: boolean;
  customer: CustomerType | null;
  onChoose: (customer: CustomerType) => void;
  onOpenChange: (open: boolean) => void;
  accessCode?: string;
}) {
  // Until a type is chosen the dialog cannot be dismissed.
  const required = customer === null;
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => (required && !next ? null : onOpenChange(next))}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Don't pre-focus an option: it looks already chosen.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-x-3 top-1/2 z-[60] mx-auto max-w-md -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:p-6"
        >
          <DialogPrimitive.Title className="text-lg font-bold">
            ลูกค้าคนนี้เป็นลูกค้าแบบไหน?
          </DialogPrimitive.Title>
          <p className="mt-1 text-sm text-muted-foreground">
            ใช้คิดโปรซื้อหลายเครื่อง เปลี่ยนได้ทีหลังจากปุ่มลูกค้ามุมซ้ายบน
          </p>
          <div className="mt-4 grid gap-2">
            {(Object.keys(CUSTOMER_TYPES) as CustomerType[]).map((value) => {
              const { label, hint, Icon } = CUSTOMER_TYPES[value];
              const active = customer === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChoose(value)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full",
                      value === "existing" ? "bg-sky-100 text-sky-700" : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold">{label}</span>
                    <span className="block text-sm text-muted-foreground">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {accessCode && (
            <p className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                เข้าใช้ด้วยรหัส <b className="text-foreground">{accessCode}</b>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/price-list/logout/", { method: "POST" }).catch(() => undefined);
                  window.location.reload();
                }}
                className="h-9 rounded-lg px-2 font-semibold text-primary hover:bg-primary/5"
              >
                ออกจากระบบ
              </button>
            </p>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
