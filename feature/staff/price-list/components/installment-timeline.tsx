import { cn } from "@/lib/utils";
import { floorBaht, formatBaht, type InstallmentSchedule } from "@/lib/price-list";

// Cheapest promo tier gets the strongest red; regular-price months stay neutral.
const PROMO_TONES = [
  { box: "bg-primary text-white border-primary", swatch: "bg-primary" },
  { box: "bg-rose-400 text-white border-rose-400", swatch: "bg-rose-400" },
  { box: "bg-rose-200 text-rose-900 border-rose-200", swatch: "bg-rose-200" },
  { box: "bg-amber-200 text-amber-900 border-amber-200", swatch: "bg-amber-200" },
];
const REGULAR_TONE = {
  box: "bg-white text-muted-foreground border-border",
  swatch: "bg-white border border-border",
};
const TH_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function rangeText(ranges: [number, number][]) {
  return ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");
}

/**
 * Month-by-month boxes, one row per contract year, coloured by how much the customer pays.
 * The contract average and total sit under the boxes and legend.
 * Columns are bills 1–12 of each contract year; the calendar month is in each box's tooltip.
 */
export function InstallmentTimeline({
  schedule,
  regularMonthly,
  start,
}: {
  schedule: InstallmentSchedule;
  /** Regular monthly fee to compare the average against (omit for mixed carts). */
  regularMonthly?: number;
  /** Contract start, month 0–11 and Buddhist-era year. */
  start: { month: number; year: number };
}) {
  const promoAmounts = [...new Set(schedule.rows.filter((r) => r.isPromotion).map((r) => r.amount))].sort(
    (a, b) => a - b,
  );
  const toneOf = (amount: number, isPromotion: boolean) =>
    isPromotion
      ? (PROMO_TONES[Math.min(promoAmounts.indexOf(amount), PROMO_TONES.length - 1)] ?? REGULAR_TONE)
      : REGULAR_TONE;

  const months = schedule.rows.flatMap((row) =>
    Array.from({ length: row.months }, (_, i) => ({
      bill: row.from + i,
      amount: row.amount,
      isPromotion: row.isPromotion,
    })),
  );
  const years = Array.from({ length: Math.ceil(months.length / 12) }, (_, y) =>
    months.slice(y * 12, y * 12 + 12),
  );
  const monthName = (offset: number) => TH_MONTHS[(start.month + offset) % 12];
  const yearOf = (offset: number) => (start.year + Math.floor((start.month + offset) / 12)) % 100;

  // Legend: one entry per amount, cheapest first, with the bills it covers.
  const legend = new Map<
    string,
    { amount: number; isPromotion: boolean; months: number; ranges: [number, number][] }
  >();
  for (const row of schedule.rows) {
    const key = `${row.amount}|${row.isPromotion}`;
    const entry = legend.get(key) ?? {
      amount: row.amount,
      isPromotion: row.isPromotion,
      months: 0,
      ranges: [],
    };
    const last = entry.ranges.at(-1);
    if (last && last[1] + 1 === row.from) last[1] = row.to;
    else entry.ranges.push([row.from, row.to]);
    entry.months += row.months;
    legend.set(key, entry);
  }
  const legendItems = [...legend.values()].sort((a, b) => a.amount - b.amount);

  return (
    <div className="space-y-3">
      {schedule.advancePayment > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0 text-xs font-medium text-muted-foreground">ล่วงหน้า</span>
          <div className="flex h-8 flex-1 items-center rounded-md border border-amber-300 bg-amber-50 px-2 text-xs font-semibold text-amber-900">
            ฿{formatBaht(schedule.advancePayment)} จ่ายวันทำสัญญา (บิลแรก)
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="hidden items-center gap-2 sm:flex" aria-hidden>
          <span className="w-11 shrink-0 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
            งวดที่
          </span>
          <div className="grid flex-1 grid-cols-12 gap-0.5 sm:gap-1">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="truncate text-center text-[9px] font-medium text-muted-foreground sm:text-[11px]"
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        {years.map((year, y) => (
          <div key={y} className="flex items-center gap-2">
            <span className="w-11 shrink-0 leading-tight">
              <span className="block text-xs font-semibold">ปี {y + 1}</span>
              <span className="block text-[10px] text-muted-foreground tabular-nums">
                {y * 12 + 1}–{y * 12 + year.length}
              </span>
            </span>
            <ol className="grid flex-1 grid-cols-6 gap-1 sm:grid-cols-12">
              {year.map((m) => {
                const offset = m.bill - 1;
                const label = `งวดที่ ${m.bill} (${monthName(offset)} ${yearOf(offset)}): ฿${formatBaht(m.amount)}`;
                return (
                  <li
                    key={m.bill}
                    title={label}
                    aria-label={label}
                    className={cn(
                      "flex h-10 flex-col items-center justify-center overflow-hidden whitespace-nowrap rounded-[5px] border text-xs font-semibold leading-none tracking-tight tabular-nums sm:h-9 sm:text-[10px] sm:tracking-tighter lg:text-[11px]",
                      toneOf(m.amount, m.isPromotion).box,
                    )}
                  >
                    {/* Phones: 6 boxes per line without the column header, so each box names its bill. */}
                    <span className="mb-0.5 text-[9px] font-medium opacity-70 sm:hidden" aria-hidden>
                      งวด {m.bill}
                    </span>
                    <span aria-hidden>{formatBaht(floorBaht(m.amount))}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
        {legendItems.map((info) => (
          <li key={`${info.amount}|${info.isPromotion}`} className="flex items-center gap-2">
            <span
              className={cn("size-4 shrink-0 rounded", toneOf(info.amount, info.isPromotion).swatch)}
              aria-hidden
            />
            <span>
              <span className={cn("font-semibold tabular-nums", info.isPromotion && "text-primary")}>
                ฿{formatBaht(info.amount)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                × {info.months} เดือน · งวด {rangeText(info.ranges)}
                {info.isPromotion ? "" : " (ราคาปกติ)"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 rounded-xl bg-primary/5 px-3 py-2.5">
        <div>
          <p className="text-xs text-muted-foreground">เฉลี่ยตลอดสัญญา {schedule.months} เดือน</p>
          <p className="text-2xl font-bold leading-tight text-primary tabular-nums">
            ฿{formatBaht(floorBaht(schedule.averageMonthly))}
            <span className="text-sm font-medium text-muted-foreground">/เดือน</span>
            {regularMonthly && floorBaht(schedule.averageMonthly) < regularMonthly ? (
              <s className="ml-2 text-base font-medium text-muted-foreground">
                ฿{formatBaht(regularMonthly)}
              </s>
            ) : null}
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          รวม ฿{formatBaht(schedule.total)}
          {schedule.regularTotal > schedule.total ? (
            <>
              {" "}
              จาก <s>฿{formatBaht(schedule.regularTotal)}</s>
            </>
          ) : null}
          {schedule.advancePayment > 0 ? " (รวมเงินล่วงหน้า)" : ""}
        </p>
      </div>
    </div>
  );
}

/** Contract start = this month in Bangkok. */
export function currentStart(today: string): { month: number; year: number } {
  const [y, m] = today.split("-").map(Number);
  return { month: m - 1, year: y + 543 };
}
