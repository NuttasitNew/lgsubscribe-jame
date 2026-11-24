"use client";

import { BadgePercent } from "lucide-react";
import { cn } from "@/lib/utils";
import { findCombo, formatBaht, type ComboPromotion } from "@/lib/price-list";

/** Which promotions are applied to the prices on screen (staff can switch them off to compare). */
export type PromoSettings = { item: boolean; combo: boolean };

export const thaiShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });

/** The best combo running today for this customer type (campaign or PDF), or null. */
export function bestCombo(
  combos: ComboPromotion[],
  today: string,
  customer: ComboPromotion["customer"] = "new",
) {
  return findCombo(combos, customer, 0, today).combo;
}

export function PromoBar({
  combos,
  today,
  period,
  settings,
  onChange,
  customer,
  units,
  className,
}: {
  combos: ComboPromotion[];
  today: string;
  /** Price list period, e.g. "1 พ.ย. - 30 พ.ย. 2569". */
  period: string;
  settings: PromoSettings;
  onChange: (next: PromoSettings) => void;
  customer: ComboPromotion["customer"];
  /** Subscription units in the order so far. */
  units: number;
  className?: string;
}) {
  // The combo switch is live only once this order meets the rule for this customer type.
  const { combo, qualifies, unitsNeeded } = findCombo(combos, customer, units, today);
  const rule = combo
    ? customer === "new"
      ? `ลูกค้าใหม่ ${combo.minUnits} เครื่องขึ้นไป`
      : `ลูกค้าเดิมเพิ่ม ${combo.minUnits} เครื่องขึ้นไป`
    : "";
  const off = !settings.item || (combo && qualifies && !settings.combo);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <BadgePercent className="size-4 text-primary" aria-hidden />
        โปรโมชันวันนี้ ({thaiShortDate(today)}) · แตะเพื่อเปิด/ปิด ดูราคาก่อน-หลังโปร
      </div>
      <div className="flex flex-wrap gap-2">
        <PromoSwitch
          on={settings.item}
          onToggle={() => onChange({ ...settings, item: !settings.item })}
          title="โปรรายรุ่น"
          detail={`ราคาโปรในตารางบิลของ Price list (${period})`}
        />
        {combo && (
          <PromoSwitch
            on={qualifies && settings.combo}
            locked={!qualifies}
            onToggle={() => onChange({ ...settings, combo: !settings.combo })}
            title={`${combo.source === "campaign" ? "Subscribe Day" : "โปรคอมโบ"} ลด ${combo.percent}% ทุกบิล`}
            detail={
              qualifies
                ? `เข้าเงื่อนไขแล้ว (${rule}) · ถึง ${thaiShortDate(combo.to)}`
                : `ยังไม่เข้าเงื่อนไข · เพิ่มอีก ${unitsNeeded} เครื่อง (${rule}) · ถึง ${thaiShortDate(combo.to)}`
            }
          />
        )}
      </div>
      {off && (
        <p className="text-xs font-medium text-amber-700">
          กำลังดูราคาแบบไม่รวมโปรที่ปิดไว้ — อย่าใช้เสนอราคาลูกค้า
        </p>
      )}
    </div>
  );
}

function PromoSwitch({
  on,
  locked = false,
  onToggle,
  title,
  detail,
}: {
  on: boolean;
  /** Not available for this order yet: shown off and cannot be switched. */
  locked?: boolean;
  onToggle: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={locked || undefined}
      onClick={locked ? undefined : onToggle}
      className={cn(
        "flex min-h-11 min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        locked
          ? "cursor-not-allowed border-dashed border-amber-300 bg-amber-50/60"
          : on
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-white",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          on ? "bg-primary" : locked ? "bg-muted-foreground/15" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-semibold",
            on ? "text-primary" : locked ? "text-muted-foreground" : "text-muted-foreground line-through",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "block text-[11px] leading-tight",
            locked ? "font-medium text-amber-800" : "text-muted-foreground",
          )}
        >
          {detail}
        </span>
      </span>
    </button>
  );
}

/** Big green "customer saves" box: the number staff should say out loud, with where it comes from. */
export function SavingsBanner({
  total,
  parts,
  caption,
  className,
}: {
  total: number;
  parts: { label: string; amount: number }[];
  caption?: string;
  className?: string;
}) {
  if (total <= 0) return null;
  const shown = parts.filter((p) => p.amount > 0);
  return (
    <div className={cn("rounded-xl bg-green-600 p-3.5 text-white shadow-sm sm:p-4", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-green-50">
        <BadgePercent className="size-5" aria-hidden />
        ลูกค้าประหยัดรวม
      </div>
      <p className="mt-0.5 text-3xl font-extrabold leading-tight tabular-nums">฿{formatBaht(total)}</p>
      {caption && <p className="text-xs text-green-50/90">{caption}</p>}
      {shown.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {shown.map((p) => (
            <li
              key={p.label}
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums"
            >
              {p.label} ฿{formatBaht(p.amount)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
