import priceListData from "@/data/price-list/current.json";

/** One priced row of the monthly LG Subscribe price-list PDF (see scripts/import-price-list.py). */
export type PriceListItem = {
  id: string;
  page: number;
  category: string;
  saleType: "Subscription" | "Outright" | string;
  model: string;
  details: string[];
  contract: string;
  contractMonths: number | null;
  serviceCycle: string;
  /** Monthly fee for Subscription, one-time price for Outright. */
  regularPrice: number;
  advancePayment: number | null;
  advanceMonths: number | null;
  paymentTerms: string;
  promotion: string[];
  bills: { from: number; to: number; amount: number }[];
  promoPrice: number | null;
  discount: number | null;
  policy: string;
  /** Product photo cropped from the PDF (public path), if found. */
  image: string | null;
  controlStock: boolean;
};

/** Combo promotion: extra % off every Subscription bill when the order has enough units. */
export type ComboPromotion = {
  name: string;
  page: number;
  customer: "new" | "existing";
  /** New customer: units in this order; existing customer: units added on top of their contract. */
  minUnits: number;
  percent: number;
  /** YYYY-MM-DD, inclusive. */
  from: string;
  to: string;
  /** "pdf" = combo pages of the price list; "campaign" = current LG campaign (banner), entered by hand. */
  source?: "pdf" | "campaign";
};

export type PriceList = {
  source: string;
  version: string;
  period: string;
  importedAt: string;
  items: PriceListItem[];
  combos: ComboPromotion[];
};

export type PriceListModel = {
  model: string;
  category: string;
  details: string[];
  image: string | null;
  controlStock: boolean;
  /** Lowest first monthly bill across Subscription options, if any. */
  startingPrice: number | null;
  options: PriceListItem[];
};

export type ScheduleRow = {
  from: number;
  to: number;
  months: number;
  amount: number;
  subtotal: number;
  isPromotion: boolean;
  /** Part of this bill's reduction that pays back the advance payment (not a promotion). */
  advanceDeduction?: number;
};

export type InstallmentSchedule = {
  rows: ScheduleRow[];
  months: number;
  advancePayment: number;
  billsTotal: number;
  total: number;
  regularTotal: number;
  savings: number;
  /** Everything the customer pays (advance included) spread over the contract months. */
  averageMonthly: number;
  /** What the first bill collects: the advance alone when there is one (paid on contract day), else bill 1. */
  firstBill: number;
  /** Bill 1 is a fixed promo price ("ราคา 149.-"): collected as is, its combo discount moves to bill 2. */
  fixedFirstBill?: boolean;
};

export function getPriceList(): PriceList {
  return priceListData as PriceList;
}

/**
 * Bill-by-bill payments for a Subscription contract, as printed in the PDF:
 * promotional bill ranges first, any gap or remainder at the regular monthly fee.
 * Advance payment (TV/monitor/speaker) is paid on top and paid back by lower bills
 * ("partial deduction"), per the PDF worked example (p.59).
 */
export function buildInstallmentSchedule(
  item: PriceListItem,
  { promo = true }: { promo?: boolean } = {},
): InstallmentSchedule | null {
  const months = item.contractMonths;
  if (item.saleType === "Outright" || !months) return null;

  const rows: ScheduleRow[] = [];
  const push = (from: number, to: number, amount: number, advanceDeduction = 0) => {
    if (to < from) return;
    const count = to - from + 1;
    // Round the bill down; the pay-back absorbs the satang so bill + pay-back stays the gross fee.
    const floored = floorBaht(amount);
    if (advanceDeduction) advanceDeduction = round2(advanceDeduction + amount - floored);
    amount = floored;
    rows.push({
      from,
      to,
      months: count,
      amount,
      subtotal: amount * count,
      isPromotion: amount < item.regularPrice,
      ...(advanceDeduction ? { advanceDeduction } : {}),
    });
  };

  let next = 1;
  const bills = [...item.bills].sort((a, b) => a.from - b.from);
  const deductions = advanceDeductions(item, bills);
  for (const [index, bill] of bills.entries()) {
    if (bill.from > months || bill.to < next) continue;
    const deduction = deductions.get(index) ?? 0;
    // promo: false → regular fee everywhere, but the advance is still paid back.
    if (!promo && !deduction) continue;
    push(next, Math.min(bill.from, months + 1) - 1, item.regularPrice);
    const from = Math.max(bill.from, next);
    const to = Math.min(bill.to, months);
    push(from, to, promo ? bill.amount : round2(item.regularPrice - deduction), deduction);
    next = to + 1;
  }
  push(next, months, item.regularPrice);

  const schedule = finishSchedule(rows, item.advancePayment ?? 0, item.regularPrice * months);
  const first = bills[0];
  if (promo && first?.from === 1 && fixedPrices(item).includes(first.amount)) schedule.fixedFirstBill = true;
  return schedule;
}

/**
 * Which bill ranges pay back the advance: the last reduced ranges whose reductions add up to
 * the advance (the PDF prints e.g. 1,349 in bills 7–12 for an 8,094 advance, so allow ~1 baht/bill).
 * Returns the per-bill deduction keyed by index in the sorted bills.
 */
function advanceDeductions(item: PriceListItem, bills: PriceListItem["bills"]): Map<number, number> {
  const result = new Map<number, number>();
  let remaining = item.advancePayment ?? 0;
  for (let i = bills.length - 1; i >= 0 && remaining > 0; i--) {
    const bill = bills[i];
    const reduction = item.regularPrice - bill.amount;
    if (reduction <= 0) continue;
    const count = bill.to - bill.from + 1;
    const perBill = reduction * count - remaining <= count ? reduction : round2(remaining / count);
    result.set(i, perBill);
    remaining = round2(remaining - perBill * count);
  }
  return result;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
/** Every price staff quote is rounded down to whole baht, per unit (orders sum the rounded units). */
export const floorBaht = (value: number) => Math.floor(value + 1e-6);
/** Fixed promo prices printed as "ราคา 149.-" in the item's promotions. */
const fixedPrices = (item: PriceListItem) =>
  item.promotion.flatMap((p) =>
    [...p.matchAll(/ราคา\s*([\d,]+(?:\.\d+)?)\s*\.-/g)].map((m) => Number(m[1].replace(/,/g, ""))),
  );

function finishSchedule(
  rows: ScheduleRow[],
  advancePayment: number,
  regularTotal: number,
): InstallmentSchedule {
  const months = rows.reduce((sum, row) => sum + row.months, 0);
  const billsTotal = round2(rows.reduce((sum, row) => sum + row.subtotal, 0));
  const total = round2(billsTotal + advancePayment);
  return {
    rows,
    months,
    advancePayment,
    billsTotal,
    total,
    regularTotal,
    savings: Math.max(0, round2(regularTotal - total)),
    averageMonthly: months ? total / months : 0,
    firstBill: advancePayment > 0 ? advancePayment : (rows[0]?.amount ?? 0),
  };
}

/**
 * Combo discount, as in the PDF p.60 example: the % comes off the bill before any advance
 * pay-back, the bill is rounded down to whole baht, then the pay-back is subtracted again:
 * bills 1–6 2,999 − 1,499 promo − 225 = 1,275 · bills 7–12 2,999 − 450 − 1,499 advance = 1,050.
 * A fixed first bill ("ราคา 149.-") is collected as is and its discount comes off bill 2.
 * Advance payment itself is unchanged.
 */
export function applyComboDiscount(schedule: InstallmentSchedule, percent: number): InstallmentSchedule {
  if (!percent) return schedule;
  const bills = schedule.rows.flatMap((row) =>
    Array.from({ length: row.months }, (_, i) => ({ bill: row.from + i, row })),
  );
  let carry = 0;
  const rows: ScheduleRow[] = [];
  for (const { bill, row } of bills) {
    const deduction = row.advanceDeduction ?? 0;
    const before = row.amount + deduction;
    let amount = floorBaht((before * (100 - percent)) / 100) - deduction;
    if (bill === 1 && schedule.fixedFirstBill) {
      carry = row.amount - amount;
      amount = row.amount;
    } else if (carry) {
      amount = Math.max(0, amount - carry);
      carry = 0;
    }
    const last = rows.at(-1);
    if (last && last.amount === amount && (last.advanceDeduction ?? 0) === deduction) {
      last.to = bill;
      last.months += 1;
      last.subtotal = amount * last.months;
    } else {
      rows.push({
        from: bill,
        to: bill,
        months: 1,
        amount,
        subtotal: amount,
        isPromotion: true,
        ...(deduction ? { advanceDeduction: deduction } : {}),
      });
    }
  }
  return {
    ...finishSchedule(rows, schedule.advancePayment, schedule.regularTotal),
    fixedFirstBill: schedule.fixedFirstBill,
  };
}

/** Month-by-month sum of several contracts (different lengths allowed), regrouped into rows. */
export function combineSchedules(
  parts: { schedule: InstallmentSchedule; regularPrice: number }[],
): InstallmentSchedule | null {
  if (parts.length === 0) return null;
  const months = Math.max(...parts.map((p) => p.schedule.months));
  const rows: ScheduleRow[] = [];
  for (let bill = 1; bill <= months; bill++) {
    let amount = 0;
    let regular = 0;
    for (const { schedule, regularPrice } of parts) {
      const row = schedule.rows.find((r) => r.from <= bill && bill <= r.to);
      if (!row) continue;
      amount += row.amount;
      regular += regularPrice;
    }
    amount = round2(amount);
    const isPromotion = amount < regular;
    const last = rows.at(-1);
    if (last && last.amount === amount && last.isPromotion === isPromotion) {
      last.to = bill;
      last.months += 1;
      last.subtotal = round2(last.subtotal + amount);
    } else {
      rows.push({ from: bill, to: bill, months: 1, amount, subtotal: amount, isPromotion });
    }
  }
  return {
    ...finishSchedule(
      rows,
      round2(parts.reduce((sum, p) => sum + p.schedule.advancePayment, 0)),
      parts.reduce((sum, p) => sum + p.schedule.regularTotal, 0),
    ),
    // Each contract's own first bill: its advance if it has one, else its bill 1.
    firstBill: round2(parts.reduce((sum, p) => sum + p.schedule.firstBill, 0)),
  };
}

/**
 * Combo rule for this customer type on this date, and whether the order qualifies.
 * Only Subscription units count (PDF p.63: combo is not for Outright).
 */
export function findCombo(
  combos: ComboPromotion[],
  customer: ComboPromotion["customer"],
  subscriptionUnits: number,
  date: string,
): { combo: ComboPromotion | null; qualifies: boolean; unitsNeeded: number } {
  // Several may overlap (PDF combo + LG campaign): the larger discount wins, as LG does not stack them.
  const combo =
    activeCombos(combos, date)
      .filter((c) => c.customer === customer)
      .sort((a, b) => b.percent - a.percent)[0] ?? null;
  if (!combo) return { combo, qualifies: false, unitsNeeded: 0 };
  const unitsNeeded = Math.max(0, combo.minUnits - subscriptionUnits);
  return { combo, qualifies: unitsNeeded === 0, unitsNeeded };
}

/** Combos running on this date (YYYY-MM-DD). */
export function activeCombos(combos: ComboPromotion[], date: string): ComboPromotion[] {
  return combos.filter((c) => c.from <= date && date <= c.to);
}

/** Today in Bangkok as YYYY-MM-DD. */
export function bangkokToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export type YearSummary = {
  year: number;
  from: number;
  to: number;
  /** Distinct monthly amounts in bill order, e.g. [{amount:149, months:1},{amount:424, months:11}]. */
  parts: { amount: number; months: number; isPromotion: boolean }[];
  total: number;
};

/** Contract years (12 bills each) with what the customer pays per month in that year. */
export function buildYearlySummary(schedule: InstallmentSchedule): YearSummary[] {
  const years: YearSummary[] = [];
  for (let start = 1; start <= schedule.months; start += 12) {
    const end = Math.min(start + 11, schedule.months);
    const parts: YearSummary["parts"] = [];
    for (const row of schedule.rows) {
      const months = Math.min(row.to, end) - Math.max(row.from, start) + 1;
      if (months <= 0) continue;
      const last = parts.at(-1);
      if (last && last.amount === row.amount) last.months += months;
      else parts.push({ amount: row.amount, months, isPromotion: row.isPromotion });
    }
    years.push({
      year: years.length + 1,
      from: start,
      to: end,
      parts,
      total: parts.reduce((sum, p) => sum + p.amount * p.months, 0),
    });
  }
  return years;
}

export function groupByModel(items: PriceListItem[]): PriceListModel[] {
  const models = new Map<string, PriceListModel>();
  for (const item of items) {
    let entry = models.get(item.model);
    if (!entry) {
      entry = {
        model: item.model,
        category: item.category,
        details: item.details,
        image: item.image,
        controlStock: item.controlStock,
        startingPrice: null,
        options: [],
      };
      models.set(item.model, entry);
    }
    entry.options.push(item);
    entry.controlStock ||= item.controlStock;
    entry.image ??= item.image;
    if (item.saleType !== "Outright") {
      const first = buildInstallmentSchedule(item)?.firstBill ?? item.regularPrice;
      entry.startingPrice = entry.startingPrice === null ? first : Math.min(entry.startingPrice, first);
    }
  }
  return [...models.values()];
}

/** "5Y_Visit" → "5 ปี · ช่างดูแล", "No Service / 5Y" → "5 ปี · ไม่มีบริการ". */
export function contractLabel(item: PriceListItem): string {
  const years = item.contract.match(/(\d+)Y/)?.[1];
  const plan = /Visit/i.test(item.contract)
    ? "Visit"
    : /Self/i.test(item.contract)
      ? "Self"
      : /No\s*Service/i.test(item.contract) || item.serviceCycle === "No Service"
        ? "No Service"
        : "";
  return [years ? `${years} ปี` : item.contract, plan].filter(Boolean).join(" · ");
}

export function formatBaht(value: number): string {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

// Everyday words staff type → words used in the PDF categories/details.
const SEARCH_SYNONYMS: Record<string, string[]> = {
  แอร์: ["เครื่องปรับอากาศ"],
  air: ["เครื่องปรับอากาศ"],
  ทีวี: ["โทรทัศน์"],
  tv: ["โทรทัศน์"],
  ตู้เย็น: ["ตู้เย็น", "refrigerator"],
  ซักผ้า: ["ซัก"],
  อบผ้า: ["อบ"],
  กรองน้ำ: ["กรองน้ำ", "water"],
  ฟอกอากาศ: ["ฟอกอากาศ", "purifier"],
  ดูดฝุ่น: ["ดูดฝุ่น", "vacuum"],
  ล้างจาน: ["ล้างจาน", "dishwasher"],
  จอ: ["มอนิเตอร์", "โทรทัศน์", "monitor"],
  ลำโพง: ["ลำโพง", "xboom", "speaker"],
  ซาวด์บาร์: ["ซาวด์บาร์", "soundbar"],
  ผ่อน: ["subscription"],
  ซื้อขาด: ["outright"],
  ช่าง: ["visit"],
  ดูแลเอง: ["self"],
};

/** Lowercase and drop spaces/punctuation so "gv b25" finds "GV-B25FFGDB". */
export function normalizeSearch(text: string): string {
  return text.toLowerCase().replace(/[\s\-_./()·,|:+]+/g, "");
}

function searchText(model: PriceListModel): string {
  const parts = [model.model, model.category, ...model.details];
  for (const o of model.options) {
    parts.push(o.saleType, o.contract, contractLabel(o), o.serviceCycle, o.policy, ...o.promotion);
    parts.push(String(o.regularPrice), ...o.bills.map((b) => String(b.amount)));
  }
  return normalizeSearch(parts.join(" "));
}

/**
 * Full-text search: every word in the query must appear somewhere in the model
 * (code, category, details, contracts, promotions, prices), synonyms allowed.
 * Results are ranked — model-code matches first, then category, then the rest.
 */
export function searchModels(models: PriceListModel[], query: string): PriceListModel[] {
  const words = query.trim().split(/\s+/).map(normalizeSearch).filter(Boolean);
  if (words.length === 0) return models;
  const scored: { model: PriceListModel; score: number; index: number }[] = [];
  models.forEach((model, index) => {
    const haystack = searchText(model);
    const code = normalizeSearch(model.model);
    const codes = [code, ...model.details.map(normalizeSearch)];
    const category = normalizeSearch(model.category);
    let score = 0;
    for (const word of words) {
      const variants = [word, ...(SEARCH_SYNONYMS[word] ?? []).map(normalizeSearch)];
      if (!variants.some((v) => haystack.includes(v))) return;
      if (code.startsWith(word)) score += 100;
      else if (codes.some((c) => c.includes(word))) score += 50;
      else if (variants.some((v) => category.includes(v))) score += 20;
      else score += 1;
    }
    scored.push({ model, score, index });
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map((s) => s.model);
}
