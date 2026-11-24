"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BadgePercent, Eye, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  applyComboDiscount,
  buildInstallmentSchedule,
  combineSchedules,
  contractLabel,
  findCombo,
  formatBaht,
  type ComboPromotion,
  type PriceListItem,
} from "@/lib/price-list";
import { ProductImage, ScheduleView, Segmented } from "./price-list-detail";
import { InstallmentTimeline } from "./installment-timeline";
import { QuantityStepper } from "./cart-controls";
import { SavingsBanner, type PromoSettings } from "./promo-bar";

export type CartLine = { key: number; item: PriceListItem; image: string | null };

const thaiDate = (iso: string) =>
  new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });

/** Several products in one order: combined monthly payments plus the PDF combo discount. */
export function PriceListCart({
  lines,
  combos,
  today,
  start,
  wide,
  promo,
  customer,
  onAdd,
  onRemoveItem,
  onAddMore,
  onClear,
  optionsOf,
  onSwap,
  onViewSchedule,
}: {
  lines: CartLine[];
  combos: ComboPromotion[];
  today: string;
  start: { month: number; year: number };
  wide: boolean;
  promo: PromoSettings;
  customer: ComboPromotion["customer"];
  onAdd: (item: PriceListItem) => void;
  /** Remove one unit of this contract option. */
  onRemoveItem: (itemId: string) => void;
  onAddMore: () => void;
  onClear: () => void;
  /** Subscription contract options of a model (5/7 years, Visit/Self). */
  optionsOf: (model: string) => PriceListItem[];
  /** Move every unit of one card to another contract option of the same model. */
  onSwap: (fromId: string, to: PriceListItem) => void;
  /** Eye button opened one unit's schedule (for the activity log). */
  onViewSchedule?: (item: PriceListItem, units: number) => void;
}) {
  const subs = lines.filter((l) => l.item.saleType !== "Outright" && buildInstallmentSchedule(l.item));
  // One card per contract option with its quantity, in the order first added.
  const groups = [...Map.groupBy(lines, (l) => l.item.id).values()].map((ls) => ({
    line: ls[0],
    count: ls.length,
  }));
  const outright = lines.filter((l) => l.item.saleType === "Outright");
  const { combo, qualifies, unitsNeeded } = findCombo(combos, customer, subs.length, today);
  const percent = promo.combo && qualifies && combo ? combo.percent : 0;

  const priced = subs.map((l) => {
    const base = buildInstallmentSchedule(l.item, { promo: promo.item })!;
    return { line: l, base, schedule: applyComboDiscount(base, percent) };
  });
  const combined = combineSchedules(
    priced.map((p) => ({ schedule: p.schedule, regularPrice: p.line.item.regularPrice })),
  );
  const withoutCombo = combineSchedules(
    priced.map((p) => ({ schedule: p.base, regularPrice: p.line.item.regularPrice })),
  );
  const comboSavings = combined && withoutCombo ? withoutCombo.total - combined.total : 0;
  const regularFirst = priced.reduce((sum, p) => sum + p.line.item.regularPrice, 0);
  const outrightTotal = outright.reduce((sum, l) => sum + (l.item.promoPrice ?? l.item.regularPrice), 0);
  // One product's own schedule (eye button), with the same promos/combo as the total.
  const [viewing, setViewing] = useState<string | null>(null);
  // Right panel: one combined schedule, or each product's own schedule stacked.
  const [split, setSplit] = useState(false);
  const canSplit = new Set(priced.map((p) => p.line.item.id)).size > 1;
  const viewed = priced.find((p) => p.line.item.id === viewing) ?? null;

  return (
    <div
      className={cn(
        "min-h-[calc(100dvh-118px)] space-y-5 bg-white px-4 pb-10 pt-4 md:min-h-0 md:bg-transparent md:p-6",
        wide && "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8 lg:space-y-0",
      )}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-60">
            <p className="text-sm text-muted-foreground">
              ใบเสนอหลายเครื่อง · {customer === "new" ? "ลูกค้าใหม่" : "ลูกค้าเดิม"}
            </p>
            <h2 className="text-xl font-bold leading-tight sm:text-2xl">
              รายการที่เลือก ({lines.length} เครื่อง)
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 /> ล้างรายการ
            </Button>
            <Button variant="outline" size="sm" onClick={onAddMore}>
              <Plus /> เพิ่มสินค้า
            </Button>
          </div>
        </div>

        <ComboStatus
          combo={combo}
          qualifies={qualifies}
          unitsNeeded={unitsNeeded}
          customer={customer}
          enabled={promo.combo}
        />

        <ul className="space-y-2">
          {groups.map(({ line: l, count }) => {
            const p = priced.find((x) => x.line.item.id === l.item.id);
            const label = l.item.saleType === "Outright" ? "ซื้อขาด" : contractLabel(l.item);
            return (
              <li
                key={l.item.id}
                className="flex gap-3 rounded-xl border border-border bg-white p-2.5 sm:gap-4"
              >
                <ProductImage
                  src={l.image}
                  alt={l.item.model}
                  sizes="160px"
                  className="size-28 self-start bg-secondary/40 sm:size-36"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-semibold leading-snug">{l.item.model}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.item.category} · {label}
                    </p>
                    <ContractChips
                      item={l.item}
                      options={optionsOf(l.item.model)}
                      onPick={(to) => {
                        if (viewing === l.item.id) setViewing(to.id);
                        onSwap(l.item.id, to);
                      }}
                    />
                    {p ? (
                      <p className="text-xs tabular-nums">
                        บิลแรก <b className="text-primary">฿{formatBaht(p.schedule.rows[0].amount)}</b> ·
                        เฉลี่ย ฿{formatBaht(Math.round(p.schedule.averageMonthly))}/ด.
                        {count > 1 && " ต่อเครื่อง"}
                        {percent > 0 && (
                          <span className="ml-1 inline-block rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-bold text-white">
                            −{percent}% ทุกบิล
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs tabular-nums">
                        ชำระครั้งเดียว ฿{formatBaht(l.item.promoPrice ?? l.item.regularPrice)}
                        {count > 1 && " ต่อเครื่อง"} · ไม่ร่วมคอมโบ
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {count} เครื่อง
                      {p && count > 1 && (
                        <>
                          {" "}
                          · บิลแรกรวม{" "}
                          <b className="text-foreground">฿{formatBaht(p.schedule.rows[0].amount * count)}</b>
                        </>
                      )}
                      {!p && count > 1 && (
                        <>
                          {" "}
                          · รวม{" "}
                          <b className="text-foreground">
                            ฿{formatBaht((l.item.promoPrice ?? l.item.regularPrice) * count)}
                          </b>
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {p && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewing(l.item.id);
                            onViewSchedule?.(l.item, count);
                          }}
                          aria-haspopup="dialog"
                          aria-label={`ดูตารางผ่อน ${l.item.model} ${label}`}
                          className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Eye className="size-4 text-primary" aria-hidden />
                          <span className="hidden min-[400px]:inline">ตาราง</span>
                        </button>
                      )}
                      <QuantityStepper
                        size="sm"
                        label={`${l.item.model} ${label}`}
                        count={count}
                        onAdd={() => onAdd(l.item)}
                        onRemove={() => onRemoveItem(l.item.id)}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {combined && (
          <div className="grid grid-cols-2 gap-2">
            <Tile
              label="บิลแรกรวม"
              value={`฿${formatBaht(combined.rows[0].amount)}`}
              was={regularFirst}
              primary
            />
            <Tile
              label="เฉลี่ยรวม/เดือน"
              value={`฿${formatBaht(Math.round(combined.averageMonthly))}`}
              was={Math.round(combined.regularTotal / combined.months)}
              primary
            />
            <Tile
              label="รวมตลอดสัญญา"
              value={`฿${formatBaht(combined.total)}`}
              was={combined.regularTotal}
              className="col-span-2"
            />
            <SavingsBanner
              className="col-span-2"
              total={combined.savings}
              caption={`เทียบราคาปกติตลอดสัญญา ฿${formatBaht(combined.regularTotal)}`}
              parts={[
                { label: "โปรรายรุ่น", amount: withoutCombo ? withoutCombo.savings : 0 },
                {
                  label: `${combo?.source === "campaign" ? "Subscribe Day" : "คอมโบ"} ${percent}%`,
                  amount: comboSavings,
                },
              ]}
            />
          </div>
        )}
        {outright.length > 0 && (
          <p className="rounded-xl bg-secondary px-3 py-2 text-sm">
            ซื้อขาด {outright.length} เครื่อง ชำระครั้งเดียว <b>฿{formatBaht(outrightTotal)}</b>{" "}
            (ไม่รวมในตารางผ่อน)
          </p>
        )}
      </div>

      {combined ? (
        <div className="space-y-4">
          {canSplit && (
            <Segmented
              label="ตารางผ่อนรวมหรือแยกรายเครื่อง"
              value={split ? "split" : "all"}
              onChange={(v) => setSplit(v === "split")}
              items={[
                { value: "all", label: "รวมทุกเครื่อง" },
                { value: "split", label: "แยกรายเครื่อง" },
              ]}
            />
          )}
          {split && canSplit ? (
            <ol className="space-y-6">
              {groups.flatMap(({ line: l, count }) => {
                const p = priced.find((x) => x.line.item.id === l.item.id);
                if (!p) return [];
                return [
                  <li key={l.item.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        src={l.image}
                        alt=""
                        sizes="64px"
                        className="size-12 shrink-0 bg-secondary/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-all font-semibold leading-snug">{l.item.model}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.item.category} · {contractLabel(l.item)}
                          {count > 1 ? ` · ต่อเครื่อง (สั่ง ${count} เครื่อง)` : ""}
                          {percent > 0 && ` · หักคอมโบ ${percent}% แล้ว`}
                        </p>
                      </div>
                    </div>
                    <InstallmentTimeline
                      schedule={p.schedule}
                      regularMonthly={l.item.regularPrice}
                      start={start}
                    />
                  </li>,
                ];
              })}
            </ol>
          ) : (
            <ScheduleView
              key={`${percent}-${promo.item}-${lines.length}`}
              schedule={combined}
              regularMonthly={Math.round(combined.regularTotal / combined.months)}
              wide={wide}
              start={start}
              note={
                <p className="text-xs leading-relaxed text-muted-foreground">
                  ยอดรวมทุกเครื่องต่อเดือน (สัญญาสั้นจบก่อน ยอดจะลดลงเอง)
                  {combo && percent > 0 && (
                    <>
                      {" "}
                      · คอมโบคิดจากบิลหลังหักโปรแต่ละรุ่น ตามตัวอย่าง Price list หน้า 60 · บิลแรกราคาบังคับ
                      (เช่น 149.-) เก็บเต็ม ส่วนลดไปหักบิลที่ 2 · ทุกยอดปัดลงเป็นบาทเต็มรายเครื่องก่อนรวม ·{" "}
                      {combo.name}
                      {combo.page > 0 && <> (หน้า {combo.page})</>} · ยอดจริงอาจปัดเศษต่างจากระบบ OSMS
                      ได้เล็กน้อย
                    </>
                  )}
                </p>
              }
            />
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          ยังไม่มีสินค้าแบบผ่อนในรายการ
        </p>
      )}

      <DialogPrimitive.Root open={viewed !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-x-2 top-[7.5dvh] z-50 flex h-[85dvh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:inset-auto md:left-1/2 md:top-[6dvh] md:h-auto md:max-h-[88dvh] md:w-[min(48rem,calc(100vw-3rem))] md:-translate-x-1/2 md:overflow-hidden md:rounded-2xl"
          >
            {viewed && (
              <>
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <ProductImage
                    src={viewed.line.image}
                    alt=""
                    sizes="64px"
                    className="size-14 bg-secondary/40"
                  />
                  <div className="min-w-0 flex-1">
                    <DialogPrimitive.Title className="break-all font-bold leading-snug">
                      {viewed.line.item.model}
                    </DialogPrimitive.Title>
                    <p className="text-xs text-muted-foreground">
                      {viewed.line.item.category} · {contractLabel(viewed.line.item)} · ต่อ 1 เครื่อง
                      {percent > 0 && ` · หักคอมโบ ${percent}% แล้ว`}
                    </p>
                  </div>
                  <DialogPrimitive.Close
                    aria-label="ปิด"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <ScheduleView
                    schedule={viewed.schedule}
                    regularMonthly={viewed.line.item.regularPrice}
                    wide={false}
                    start={start}
                  />
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

function ComboStatus({
  combo,
  qualifies,
  unitsNeeded,
  customer,
  enabled,
}: {
  combo: ComboPromotion | null;
  qualifies: boolean;
  unitsNeeded: number;
  customer: ComboPromotion["customer"];
  enabled: boolean;
}) {
  if (!combo) {
    return (
      <p className="rounded-xl bg-secondary px-3 py-2.5 text-sm text-muted-foreground">วันนี้ไม่มีโปรคอมโบ</p>
    );
  }
  if (!enabled) {
    return (
      <p className="rounded-xl bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
        ปิดโปร {combo.name} ไว้ — ยอดด้านล่างยังไม่หักส่วนลด {combo.percent}%
      </p>
    );
  }
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-xl px-3 py-2.5 text-sm",
        qualifies
          ? "bg-green-50 text-green-900 ring-1 ring-green-200"
          : "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
      )}
    >
      <BadgePercent className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">
          {qualifies
            ? `ได้ส่วนลด ${combo.percent}% ทุกบิล`
            : `เพิ่มอีก ${unitsNeeded} เครื่อง รับส่วนลด ${combo.percent}% ทุกบิล`}
        </p>
        <p className="text-xs opacity-80">
          {customer === "new"
            ? `ลูกค้าใหม่: ซื้อแบบผ่อนตั้งแต่ ${combo.minUnits} เครื่องขึ้นไป ติดตั้งที่อยู่เดียวกัน`
            : `ลูกค้าเดิม: ซื้อเพิ่มตั้งแต่ ${combo.minUnits} เครื่องขึ้นไป (เลือกสัญญาเดิมใน OSMS ด้วย)`}{" "}
          · {combo.source === "campaign" ? "Subscribe Day ตามแบนเนอร์ " : ""}ถึง {thaiDate(combo.to)} ·
          ยกเลิกบางเครื่อง ออเดอร์คอมโบทั้งหมดถูกยกเลิก
        </p>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  was,
  primary,
  className,
}: {
  label: string;
  value: string;
  was?: number;
  primary?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-white p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-bold leading-tight tabular-nums", primary && "text-primary")}>
        {value}
      </p>
      {was !== undefined && `฿${formatBaht(was)}` !== value && (
        <p className="text-xs text-muted-foreground tabular-nums">
          จาก <s>฿{formatBaht(was)}</s>
        </p>
      )}
    </div>
  );
}

/** Contract switch on each cart card: years (5/7) and service plan (Visit = technician visits, Self = self care). */
function ContractChips({
  item,
  options,
  onPick,
}: {
  item: PriceListItem;
  options: PriceListItem[];
  onPick: (to: PriceListItem) => void;
}) {
  if (item.saleType === "Outright" || options.length < 2) return null;
  return (
    <div className="my-1.5 flex flex-wrap gap-1" role="group" aria-label={`เลือกสัญญา ${item.model}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => o.id !== item.id && onPick(o)}
          aria-pressed={o.id === item.id}
          className={cn(
            "h-8 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            o.id === item.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white text-foreground hover:bg-secondary",
          )}
        >
          {contractLabel(o)}
          <span className="ml-1 font-normal tabular-nums opacity-80">฿{formatBaht(o.regularPrice)}</span>
        </button>
      ))}
    </div>
  );
}
