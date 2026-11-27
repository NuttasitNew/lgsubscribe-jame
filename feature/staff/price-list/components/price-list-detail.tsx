"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InstallmentTimeline } from "./installment-timeline";
import { QuantityStepper } from "./cart-controls";
import { SavingsBanner, type PromoSettings } from "./promo-bar";
import {
  applyComboDiscount,
  buildInstallmentSchedule,
  buildYearlySummary,
  contractLabel,
  floorBaht,
  formatBaht,
  type ComboPromotion,
  type InstallmentSchedule,
  type PriceListItem,
  type PriceListModel,
} from "@/lib/price-list";

type Start = { month: number; year: number };

export function PriceListDetail({
  model,
  wide = false,
  start,
  promo,
  combo,
  appliedCombo = null,
  customer,
  countOf,
  onAdd,
  onRemove,
}: {
  model: PriceListModel;
  wide?: boolean;
  start: Start;
  promo: PromoSettings;
  /** Best combo running today for this customer type (null when none or switched off). */
  combo: ComboPromotion | null;
  /** The combo the current order already qualifies for: prices on this page include it. */
  appliedCombo?: ComboPromotion | null;
  customer: ComboPromotion["customer"];
  countOf: (itemId: string) => number;
  onAdd: (item: PriceListItem) => void;
  onRemove: (itemId: string) => void;
}) {
  const saleTypes = useMemo(() => [...new Set(model.options.map((o) => o.saleType))], [model]);
  const [saleType, setSaleType] = useState<string>(
    saleTypes.includes("Subscription") ? "Subscription" : (saleTypes[0] ?? ""),
  );
  const options = model.options.filter((o) => o.saleType === saleType);
  const [optionId, setOptionId] = useState<string | undefined>(options[0]?.id);
  const option = options.find((o) => o.id === optionId) ?? options[0];
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        "min-h-[calc(100dvh-118px)] space-y-5 bg-white px-4 pb-28 pt-4 md:min-h-0 md:bg-transparent md:p-6",
        wide && "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8 lg:space-y-0",
      )}
    >
      <div className="space-y-5">
        <div className="flex gap-3">
          <ProductImage src={model.image} alt={model.model} className="size-20 sm:size-24" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{model.category}</p>
            <h2 className="break-all text-xl font-bold leading-tight sm:text-2xl">{model.model}</h2>
            {model.controlStock && (
              <Badge variant="outline" className="mt-2 border-amber-300 bg-amber-50 text-amber-800">
                Control Stock — เช็คสต็อกก่อนเสนอขาย
              </Badge>
            )}
            {model.details.length > 0 && (
              <div className="mt-2">
                <ul
                  className={cn("space-y-0.5 text-sm text-muted-foreground", !showDetails && "line-clamp-2")}
                >
                  {model.details.map((d, i) => (
                    <li
                      key={i}
                      className={cn(!showDetails && "inline after:content-['_·_'] last:after:content-none")}
                    >
                      {d}
                    </li>
                  ))}
                </ul>
                {model.details.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowDetails((v) => !v)}
                    className="mt-1 text-sm font-medium text-primary"
                  >
                    {showDetails ? "ซ่อนรายละเอียด" : "ดูรายละเอียดรุ่น"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {saleTypes.length > 1 && (
          <Segmented
            label="แบบการขาย"
            value={saleType}
            onChange={(v) => {
              setSaleType(v);
              setOptionId(model.options.find((o) => o.saleType === v)?.id);
            }}
            items={saleTypes.map((s) => ({
              value: s,
              label: s === "Outright" ? "ซื้อขาด" : "ผ่อน (Subscription)",
            }))}
          />
        )}

        <div>
          <p className="mb-2 text-sm font-semibold">เลือกสัญญา</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOptionId(o.id)}
                aria-pressed={o.id === option?.id}
                className={cn(
                  "min-h-14 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  o.id === option?.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-white hover:bg-secondary",
                )}
              >
                <span className="block text-sm font-semibold">{contractLabel(o)}</span>
                <span className="block text-xs text-muted-foreground">
                  {o.serviceCycle && o.serviceCycle !== "No Service"
                    ? `บริการ${o.serviceCycle}`
                    : "ไม่มีบริการ"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {option &&
          (option.saleType === "Outright" ? (
            <OutrightPrice item={option} />
          ) : (
            <ScheduleSummary item={option} wide={wide} promo={promo.item} combo={appliedCombo} />
          ))}

        {option && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {countOf(option.id) > 0
                  ? `ในรายการ ${countOf(option.id)} เครื่อง (${option.saleType === "Outright" ? "ซื้อขาด" : contractLabel(option, { cycle: true })})`
                  : "ซื้อหลายเครื่อง?"}
              </p>
              {option.saleType === "Outright" ? (
                <p className="text-xs text-muted-foreground">ซื้อขาดไม่ร่วมโปรคอมโบ</p>
              ) : (
                <ComboPreview
                  item={option}
                  promo={promo}
                  combo={combo}
                  applied={appliedCombo !== null}
                  customer={customer}
                />
              )}
            </div>
            <QuantityStepper
              label={model.model}
              count={countOf(option.id)}
              onAdd={() => onAdd(option)}
              onRemove={() => onRemove(option.id)}
            />
          </div>
        )}
      </div>

      {option && option.saleType !== "Outright" && (
        <ItemSchedule
          key={`${option.id}-${promo.item}`}
          item={option}
          wide={wide}
          start={start}
          promo={promo.item}
          combo={appliedCombo}
        />
      )}
    </div>
  );
}

export function Segmented({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col gap-1 rounded-xl bg-muted p-1">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="radio"
          aria-checked={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors",
            value === it.value
              ? "bg-white text-primary shadow ring-1 ring-primary/40"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  was,
  note,
  className,
}: {
  label: string;
  value: string;
  tone?: "primary";
  was?: number;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-white p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-bold leading-tight", tone === "primary" && "text-primary")}>
        {value}
      </p>
      {was !== undefined && `฿${formatBaht(was)}` !== value && (
        <p className="text-xs text-muted-foreground tabular-nums">
          จาก <s>฿{formatBaht(was)}</s>
        </p>
      )}
      {note && <p className="text-xs text-amber-800 tabular-nums">{note}</p>}
    </div>
  );
}

function Promotions({ item }: { item: PriceListItem }) {
  if (item.promotion.length === 0) return null;
  return (
    <div className="rounded-xl bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary">โปรโมชัน</p>
      <ul className="mt-1 space-y-0.5 text-sm">
        {item.promotion.map((p, i) => (
          <li key={i}>• {p}</li>
        ))}
      </ul>
    </div>
  );
}

function SourceNote({ item }: { item: PriceListItem }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      อ้างอิง Price list หน้า {item.page}
      {item.policy && (
        <>
          {" "}
          · Policy <span className="break-all font-mono">{item.policy}</span>
        </>
      )}
      {item.paymentTerms && <> · {item.paymentTerms}</>}
    </p>
  );
}

function OutrightPrice({ item }: { item: PriceListItem }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="ราคาปกติ (ซื้อขาด)" value={`฿${formatBaht(item.regularPrice)}`} />
        <Stat
          label="ราคาโปร"
          value={item.promoPrice ? `฿${formatBaht(item.promoPrice)}` : "—"}
          tone="primary"
        />
      </div>
      {item.discount ? <p className="text-sm">ส่วนลด ฿{formatBaht(item.discount)}</p> : null}
      <Promotions item={item} />
      <p className="text-sm text-muted-foreground">ซื้อขาดชำระครั้งเดียว ไม่มีตารางผ่อน</p>
      <SourceNote item={item} />
    </div>
  );
}

/** This contract's schedule, with the order's combo applied once it qualifies. */
function scheduleFor(item: PriceListItem, promo: boolean, combo: ComboPromotion | null) {
  const schedule = buildInstallmentSchedule(item, { promo });
  return schedule && combo ? applyComboDiscount(schedule, combo.percent) : schedule;
}

function ScheduleSummary({
  item,
  wide,
  promo,
  combo,
}: {
  item: PriceListItem;
  wide: boolean;
  promo: boolean;
  combo: ComboPromotion | null;
}) {
  const schedule = scheduleFor(item, promo, combo);
  if (!schedule) return null;
  const advance = schedule.advancePayment;

  return (
    <div className="space-y-4">
      <div className={cn("grid grid-cols-2 gap-2", !wide && "lg:grid-cols-4")}>
        <Stat
          label="บิลแรก"
          value={`฿${formatBaht(schedule.firstBill)}`}
          tone="primary"
          was={advance > 0 ? undefined : item.regularPrice}
          note={advance > 0 ? "เงินล่วงหน้า จ่ายวันทำสัญญา" : undefined}
        />
        <Stat
          label="เฉลี่ยตลอดสัญญา/เดือน"
          value={`฿${formatBaht(floorBaht(schedule.averageMonthly))}`}
          tone="primary"
          was={item.regularPrice}
        />
        <Stat
          label="ราคาปกติ/เดือน"
          value={`฿${formatBaht(item.regularPrice)}`}
          className={advance > 0 ? undefined : "col-span-2"}
        />
        {advance > 0 && (
          <Stat label="งวดที่ 1 (ค่าเช่า)" value={`฿${formatBaht(schedule.rows[0].amount)}`} />
        )}
      </div>

      <SavingsBanner
        total={schedule.savings}
        caption={`ตลอดสัญญา ${schedule.months} เดือน เทียบราคาปกติ ฿${formatBaht(schedule.regularTotal)}${combo ? ` · รวมส่วนลดคอมโบ ${combo.percent}% แล้ว` : ""}`}
        parts={[]}
      />

      {promo ? (
        <Promotions item={item} />
      ) : (
        <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
          ปิดโปรรายรุ่นอยู่ — ตัวเลขด้านบนคือราคาปกติทุกบิล
        </p>
      )}
    </div>
  );
}

/** What this contract costs per bill when it joins today's combo (switch "combo" on). */
function ComboPreview({
  item,
  promo,
  combo,
  applied,
  customer,
}: {
  item: PriceListItem;
  promo: PromoSettings;
  combo: ComboPromotion | null;
  applied: boolean;
  customer: ComboPromotion["customer"];
}) {
  if (combo && applied) {
    return (
      <p className="text-xs font-medium text-green-700">
        รายการเข้าเงื่อนไขคอมโบแล้ว · ราคาและตารางในหน้านี้ลดเพิ่ม {combo.percent}% แล้ว
      </p>
    );
  }
  if (!combo) {
    return <p className="text-xs text-muted-foreground">รวมหลายเครื่องเพื่อดูยอดผ่อนต่อเดือนรวมกัน</p>;
  }
  const base = buildInstallmentSchedule(item, { promo: promo.item });
  if (!base) return null;
  const withCombo = applyComboDiscount(base, combo.percent);
  return (
    <p className="text-xs text-muted-foreground">
      {customer === "new"
        ? `ลูกค้าใหม่ซื้อ ${combo.minUnits} เครื่องขึ้นไป ลดเพิ่ม ${combo.percent}%`
        : `ลูกค้าเดิมเพิ่ม ${combo.minUnits} เครื่องขึ้นไป ลดเพิ่ม ${combo.percent}%`}{" "}
      → รุ่นนี้บิลแรก <b className="text-sm text-green-700">฿{formatBaht(withCombo.firstBill)}</b>
      {withCombo.advancePayment > 0 && " (เงินล่วงหน้า)"} ·
      เฉลี่ย <b className="text-sm text-green-700">฿{formatBaht(floorBaht(withCombo.averageMonthly))}</b>
      /เดือน
    </p>
  );
}

function ItemSchedule({
  item,
  wide,
  start,
  promo,
  combo,
}: {
  item: PriceListItem;
  wide: boolean;
  start: Start;
  promo: boolean;
  combo: ComboPromotion | null;
}) {
  const schedule = scheduleFor(item, promo, combo);
  if (!schedule) return null;
  return (
    <ScheduleView
      schedule={schedule}
      regularMonthly={item.regularPrice}
      wide={wide}
      start={start}
      note={<SourceNote item={item} />}
    />
  );
}

export function ProductImage({
  src,
  alt,
  className,
  sizes = "96px",
}: {
  src: string | null;
  alt: string;
  className?: string;
  /** Rendered width hint for next/image. */
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white",
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-contain p-1" />
      ) : (
        <ImageOff className="size-5 text-muted-foreground/60" aria-hidden />
      )}
    </div>
  );
}

/** Right-hand panel: month boxes (overview) or the installment table, switchable. */
export function ScheduleView({
  schedule,
  regularMonthly,
  wide,
  start,
  note,
}: {
  schedule: InstallmentSchedule;
  regularMonthly?: number;
  wide: boolean;
  start: Start;
  note?: ReactNode;
}) {
  const [mode, setMode] = useState<"overview" | "table">("overview");
  const [view, setView] = useState<"y" | "r" | "m">("y");
  const monthly = view === "m";
  const yearly = view === "y";

  return (
    <div className={cn("space-y-4", wide && "lg:sticky lg:top-20")}>
      <Segmented
        label="รูปแบบการแสดง"
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        items={[
          { value: "overview", label: "ภาพรวม (กล่องรายเดือน)" },
          { value: "table", label: "ตาราง" },
        ]}
      />
      {mode === "overview" ? (
        <InstallmentTimeline schedule={schedule} regularMonthly={regularMonthly} start={start} />
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold">ตารางผ่อน</h3>
            <Segmented
              label="รูปแบบตาราง"
              value={view}
              onChange={(v) => setView(v as typeof view)}
              items={[
                { value: "y", label: "รายปี" },
                { value: "r", label: "ตามช่วง" },
                { value: "m", label: "รายเดือน" },
              ]}
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className={cn("w-full tabular-nums", wide ? "text-base" : "text-sm")}>
              <thead className="bg-secondary text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {yearly ? "ปีที่" : monthly ? "งวดที่" : "รอบบิล"}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">ต่อเดือน</th>
                  {!monthly && (
                    <th className="px-3 py-2 text-right font-medium">{yearly ? "รวมทั้งปี" : "รวม"}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {schedule.advancePayment > 0 && (
                  <tr className="bg-amber-50/60">
                    <td className="px-3 py-2.5">
                      เงินล่วงหน้า
                      <span className="block text-xs text-muted-foreground">จ่ายวันทำสัญญา</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">—</td>
                    {!monthly && (
                      <td className="px-3 py-2.5 text-right font-semibold">
                        ฿{formatBaht(schedule.advancePayment)}
                      </td>
                    )}
                  </tr>
                )}
                {yearly
                  ? buildYearlySummary(schedule).map((y) => (
                      <tr
                        key={y.year}
                        className={y.parts.some((p) => p.isPromotion) ? "bg-primary/[0.03]" : undefined}
                      >
                        <td className="px-3 py-2.5 align-top">
                          <span className="font-semibold">ปีที่ {y.year}</span>
                          <span className="block text-xs text-muted-foreground">
                            งวด {y.from}–{y.to}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right align-top">
                          {y.parts.map((p, i) => (
                            <span
                              key={i}
                              className={cn("block text-base", p.isPromotion && "font-semibold text-primary")}
                            >
                              ฿{formatBaht(p.amount)}
                              {y.parts.length > 1 && (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                  × {p.months} ด.
                                </span>
                              )}
                            </span>
                          ))}
                        </td>
                        <td className="px-3 py-2.5 text-right align-top font-medium">
                          ฿{formatBaht(y.total)}
                        </td>
                      </tr>
                    ))
                  : monthly
                    ? schedule.rows.flatMap((row) =>
                        Array.from({ length: row.months }, (_, i) => (
                          <tr
                            key={row.from + i}
                            className={row.isPromotion ? "bg-primary/[0.03]" : undefined}
                          >
                            <td className="px-3 py-2">{row.from + i}</td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right",
                                row.isPromotion && "font-semibold text-primary",
                              )}
                            >
                              ฿{formatBaht(row.amount)}
                            </td>
                          </tr>
                        )),
                      )
                    : schedule.rows.map((row) => (
                        <tr key={row.from} className={row.isPromotion ? "bg-primary/[0.03]" : undefined}>
                          <td className="px-3 py-2.5">
                            {row.from === row.to ? `งวดที่ ${row.from}` : `งวดที่ ${row.from}–${row.to}`}
                            <span className="block text-xs text-muted-foreground">
                              {row.months} เดือน{row.isPromotion ? " · ราคาโปร" : ""}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right text-base",
                              row.isPromotion && "font-semibold text-primary",
                            )}
                          >
                            ฿{formatBaht(row.amount)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">
                            ฿{formatBaht(row.subtotal)}
                          </td>
                        </tr>
                      ))}
              </tbody>
              <tfoot className="border-t border-border bg-secondary/60">
                <tr>
                  <td className="px-3 py-2.5 font-semibold">รวมตลอดสัญญา</td>
                  <td colSpan={monthly ? 1 : 2} className="px-3 py-2.5 text-right text-base font-bold">
                    ฿{formatBaht(schedule.total)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 pb-2.5 text-xs text-muted-foreground">เฉลี่ยต่อเดือน</td>
                  <td
                    colSpan={monthly ? 1 : 2}
                    className="px-3 pb-2.5 text-right text-sm font-semibold text-primary"
                  >
                    ฿{formatBaht(floorBaht(schedule.averageMonthly))}
                  </td>
                </tr>
                {schedule.savings > 0 && (
                  <tr>
                    <td className="px-3 pb-2.5 text-xs text-muted-foreground">
                      เทียบราคาปกติ ฿{formatBaht(schedule.regularTotal)}
                    </td>
                    <td
                      colSpan={monthly ? 1 : 2}
                      className="px-3 pb-2.5 text-right text-xs font-semibold text-green-700"
                    >
                      ประหยัด ฿{formatBaht(schedule.savings)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {note}
    </div>
  );
}
