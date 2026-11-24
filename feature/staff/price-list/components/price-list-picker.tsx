"use client";

import { useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBaht, searchModels, type PriceListItem, type PriceListModel } from "@/lib/price-list";
import { ProductImage } from "./price-list-detail";
import { QuantityStepper, SelectedBar } from "./cart-controls";
import type { CartLine } from "./price-list-cart";

const ALL = "ทั้งหมด";

/**
 * Product picker dialog: search bar on top, category chips on row 2, product list below.
 * Full screen on phones, a tall centred panel from 768px.
 */
export function PriceListPicker({
  open,
  onOpenChange,
  models,
  selected,
  onSelect,
  lines,
  countOf,
  onAdd,
  onRemoveModel,
  onAddItem,
  onRemoveItem,
  onOpenCart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: PriceListModel[];
  selected: string | null;
  onSelect: (model: string) => void;
  lines: CartLine[];
  countOf: (model: string) => number;
  onAdd: (model: string) => void;
  onRemoveModel: (model: string) => void;
  onAddItem: (item: PriceListItem) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenCart: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const categories = useMemo(() => [ALL, ...new Set(models.map((m) => m.category))], [models]);
  const visible = useMemo(
    () => searchModels(category === ALL ? models : models.filter((m) => m.category === category), query),
    [models, query, category],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-[hsl(36_25%_97%)] shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:inset-auto md:left-1/2 md:top-[6dvh] md:h-[88dvh] md:w-[min(56rem,calc(100vw-3rem))] md:-translate-x-1/2 md:overflow-hidden md:rounded-2xl"
        >
          <DialogPrimitive.Title className="sr-only">เลือกสินค้า</DialogPrimitive.Title>

          {/* Row 1: search */}
          <div className="flex items-center gap-2 border-b border-border bg-white px-3 py-3 md:px-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                enterKeyHint="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && visible[0]) onSelect(visible[0].model);
                }}
                placeholder="ค้นหา เช่น แอร์ 12000, ทีวี oled, gv b25, น้ำเงิน"
                aria-label="ค้นหาสินค้า"
                className="h-12 w-full rounded-xl border border-input bg-white pl-10 pr-10 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <DialogPrimitive.Close className="h-12 shrink-0 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              ปิด
            </DialogPrimitive.Close>
          </div>

          <SelectedBar
            lines={lines}
            onAdd={onAddItem}
            onRemoveItem={onRemoveItem}
            layout="list"
            className="border-b border-border bg-white px-3 py-2 md:px-4"
          />

          {/* Row 2: categories */}
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-white px-3 py-2.5 [scrollbar-width:none] md:px-4">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-foreground hover:bg-secondary",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Row 3: products */}
          <div className="flex-1 overflow-y-auto px-3 pb-6 pt-2 md:px-4">
            <p className="pb-2 text-xs text-muted-foreground" aria-live="polite">
              {visible.length} รุ่น · แตะสินค้าเพื่อดูราคา · ปุ่ม เพิ่ม/−/+ ใส่หลายเครื่อง (สัญญาแรกของรุ่น
              เปลี่ยนได้ในหน้าสินค้า)
            </p>
            <ul className="grid gap-2 md:grid-cols-2">
              {visible.map((m) => (
                <li
                  key={m.model}
                  className={cn(
                    "flex h-full items-center gap-2 rounded-xl border bg-white pr-2.5 transition-colors",
                    m.model === selected ? "border-primary ring-1 ring-primary" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(m.model)}
                    aria-current={m.model === selected ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ProductImage src={m.image} alt="" className="size-16" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{m.category}</p>
                      <p className="break-all font-semibold leading-snug">{m.model}</p>
                      <p className="mt-0.5 text-xs">
                        {m.startingPrice !== null ? (
                          <>
                            บิลแรก <b className="text-primary">฿{formatBaht(m.startingPrice)}</b>
                          </>
                        ) : (
                          <span className="text-muted-foreground">ซื้อขาด</span>
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {m.model === selected && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">กำลังดู</Badge>
                        )}
                        {m.controlStock && (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                            Control Stock
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                  <QuantityStepper
                    size="sm"
                    label={m.model}
                    count={countOf(m.model)}
                    onAdd={() => onAdd(m.model)}
                    onRemove={() => onRemoveModel(m.model)}
                  />
                </li>
              ))}
              {visible.length === 0 && (
                <li className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground md:col-span-2">
                  ไม่พบสินค้าที่ค้นหา
                </li>
              )}
            </ul>
          </div>

          {/* Done: go straight to the combined price once products are chosen */}
          {lines.length > 0 && (
            <div className="border-t border-border bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-4">
              <button
                type="button"
                onClick={onOpenCart}
                className="flex h-12 w-full items-center justify-center gap-1 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                เลือกเสร็จ · ดูราคารวม {lines.length} เครื่อง <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
