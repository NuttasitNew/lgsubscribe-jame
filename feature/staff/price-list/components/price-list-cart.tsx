"use client";

import { BadgePercent, Plus } from "lucide-react";
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
import { ProductImage, ScheduleView } from "./price-list-detail";
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

  return (
    <div
      className={cn(
        "min-h-[calc(100dvh-118px)] space-y-5 bg-white px-4 pb-10 pt-4 md:min-h-0 md:bg-transparent md:p-6",
        wide && "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8 lg:space-y-0",
      )}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              ใบเสนอหลายเครื่อง · {customer === "new" ? "ลูกค้าใหม่" : "ลูกค้าเดิม"}
            </p>
            <h2 className="text-xl font-bold leading-tight sm:text-2xl">
              รายการที่เลือก ({lines.length} เครื่อง)
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={onAddMore}>
            <Plus /> เพิ่มสินค้า
          </Button>
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
                    <QuantityStepper
                      size="sm"
                      label={`${l.item.model} ${label}`}
                      count={count}
                      onAdd={() => onAdd(l.item)}
                      onRemove={() => onRemoveItem(l.item.id)}
                    />
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
                  · คอมโบคิดจากบิลหลังหักโปรแต่ละรุ่น ตามตัวอย่าง Price list หน้า 60 · {combo.name}
                  {combo.page > 0 && <> (หน้า {combo.page})</>} · ยอดจริงอาจปัดเศษต่างจากระบบ OSMS ได้เล็กน้อย
                </>
              )}
            </p>
          }
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          ยังไม่มีสินค้าแบบผ่อนในรายการ
        </p>
      )}
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
