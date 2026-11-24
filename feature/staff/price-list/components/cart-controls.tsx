"use client";

import { ChevronRight, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { contractLabel, type PriceListItem } from "@/lib/price-list";
import type { CartLine } from "./price-list-cart";

/** Add/remove from one control: "+ เพิ่ม" when empty, then "− n +". */
export function QuantityStepper({
  count,
  onAdd,
  onRemove,
  label,
  size = "md",
}: {
  count: number;
  onAdd: () => void;
  onRemove: () => void;
  /** Product name for screen readers. */
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-11";
  if (count === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        aria-label={`เพิ่ม ${label} ลงรายการ`}
        className={cn(
          h,
          "inline-flex shrink-0 items-center gap-1 rounded-xl border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Plus className="size-4" /> เพิ่ม
      </button>
    );
  }
  return (
    <div
      role="group"
      aria-label={`${label} ในรายการ ${count} เครื่อง`}
      className={cn(
        h,
        "inline-flex shrink-0 items-center overflow-hidden rounded-xl bg-primary text-primary-foreground",
      )}
    >
      <button
        type="button"
        onClick={onRemove}
        aria-label={`ลด ${label} 1 เครื่อง`}
        className="flex h-full w-10 items-center justify-center hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {count}
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`เพิ่ม ${label} อีก 1 เครื่อง`}
        className="flex h-full w-10 items-center justify-center hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/**
 * What is in the order right now: one entry per contract option with its quantity (− n +).
 * "row" = horizontal chips (page header); "list" = one row per item, stacked (picker dialog).
 */
export function SelectedBar({
  lines,
  onAdd,
  onRemoveItem,
  onOpenCart,
  layout = "row",
  className,
}: {
  lines: CartLine[];
  onAdd: (item: PriceListItem) => void;
  /** Remove one unit of this contract option. */
  onRemoveItem: (itemId: string) => void;
  onOpenCart?: () => void;
  layout?: "row" | "list";
  className?: string;
}) {
  if (lines.length === 0) return null;
  // Group units by contract option, keeping the order they were first added.
  const groups = new Map<string, { item: PriceListItem; count: number }>();
  for (const l of lines) {
    const g = groups.get(l.item.id);
    if (g) g.count += 1;
    else groups.set(l.item.id, { item: l.item, count: 1 });
  }
  const entries = [...groups.values()];
  const label = (
    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
      เลือกแล้ว {lines.length} เครื่อง
    </span>
  );
  const cartButton = onOpenCart && (
    <button
      type="button"
      onClick={onOpenCart}
      className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-primary pl-3 pr-2 text-xs font-semibold text-primary-foreground"
    >
      ดูยอดรวม <ChevronRight className="size-4" />
    </button>
  );

  if (layout === "list") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-center justify-between gap-2">
          {label}
          {cartButton}
        </div>
        <ul className="max-h-[30dvh] divide-y divide-primary/10 overflow-y-auto rounded-xl border border-primary/30 bg-primary/5">
          {entries.map(({ item, count }) => (
            <li key={item.id} className="flex items-center gap-2 py-1 pl-3 pr-1 text-sm">
              <div className="min-w-0 flex-1">
                <p className="break-all font-semibold leading-snug">{item.model}</p>
                <p className="text-xs text-muted-foreground">
                  {item.saleType === "Outright" ? "ซื้อขาด" : contractLabel(item)}
                </p>
              </div>
              <MiniStepper item={item} count={count} onAdd={onAdd} onRemoveItem={onRemoveItem} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label}
      <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none]">
        {entries.map(({ item, count }) => (
          <li key={item.id} className="shrink-0">
            <span className="inline-flex h-8 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 pl-3 pr-0.5 text-xs">
              <span className="max-w-40 truncate font-semibold">{item.model}</span>
              <span className="text-muted-foreground">
                · {item.saleType === "Outright" ? "ซื้อขาด" : contractLabel(item)}
              </span>
              <MiniStepper item={item} count={count} onAdd={onAdd} onRemoveItem={onRemoveItem} />
            </span>
          </li>
        ))}
      </ul>
      {cartButton}
    </div>
  );
}

/** Small − n + used inside SelectedBar; − at 1 shows ✕ and removes the item. */
function MiniStepper({
  item,
  count,
  onAdd,
  onRemoveItem,
}: {
  item: PriceListItem;
  count: number;
  onAdd: (item: PriceListItem) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const stepBtn =
    "flex size-8 items-center justify-center rounded-full text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <span
      role="group"
      aria-label={`${item.model} ${count} เครื่อง`}
      className="ml-1 inline-flex shrink-0 items-center rounded-full bg-white text-xs ring-1 ring-primary/30"
    >
      <button
        type="button"
        onClick={() => onRemoveItem(item.id)}
        aria-label={count === 1 ? `เอา ${item.model} ออก` : `ลด ${item.model} 1 เครื่อง`}
        className={stepBtn}
      >
        {count === 1 ? <X className="size-3.5" /> : <Minus className="size-3.5" />}
      </button>
      <span className="min-w-4 text-center font-bold tabular-nums" aria-live="polite">
        {count}
      </span>
      <button
        type="button"
        onClick={() => onAdd(item)}
        aria-label={`เพิ่ม ${item.model} อีก 1 เครื่อง`}
        className={stepBtn}
      >
        <Plus className="size-3.5" />
      </button>
    </span>
  );
}
