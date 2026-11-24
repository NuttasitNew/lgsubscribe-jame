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
};

export function getPriceList(): PriceList {
  return priceListData as PriceList;
}

/**
 * Bill-by-bill payments for a Subscription contract, as printed in the PDF:
 * promotional bill ranges first, any gap or remainder at the regular monthly fee.
 * Advance payment (TV/monitor/speaker) is paid on top, per the PDF worked example.
 */
export function buildInstallmentSchedule(
  item: PriceListItem,
  { promo = true }: { promo?: boolean } = {},
): InstallmentSchedule | null {
  const months = item.contractMonths;
  if (item.saleType === "Outright" || !months) return null;

  const rows: ScheduleRow[] = [];
  const push = (from: number, to: number, amount: number) => {
    if (to < from) return;
    const count = to - from + 1;
    rows.push({
      from,
      to,
      months: count,
      amount,
      subtotal: amount * count,
      isPromotion: amount < item.regularPrice,
    });
  };

  let next = 1;
  // promo: false → every bill at the regular fee (to compare against the promotion).
  const bills = promo ? [...item.bills].sort((a, b) => a.from - b.from) : [];
  for (const bill of bills) {
    if (bill.from > months || bill.to < next) continue;
    push(next, Math.min(bill.from, months + 1) - 1, item.regularPrice);
    const from = Math.max(bill.from, next);
    const to = Math.min(bill.to, months);
    push(from, to, bill.amount);
    next = to + 1;
  }
  push(next, months, item.regularPrice);

  return finishSchedule(rows, item.advancePayment ?? 0, item.regularPrice * months);
}

const round2 = (value: number) => Math.round(value * 100) / 100;

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
  };
}

/**
 * Combo discount: percent off every bill after the single-product promotion
 * (PDF p.60 example: 2,999 − 1,499 promo − 15% × 1,500 = 1,275). Advance payment unchanged.
 */
export function applyComboDiscount(schedule: InstallmentSchedule, percent: number): InstallmentSchedule {
  if (!percent) return schedule;
  const rows = schedule.rows.map((row) => {
    const amount = round2(row.amount * (1 - percent / 100));
    return { ...row, amount, subtotal: round2(amount * row.months), isPromotion: true };
  });
  return finishSchedule(rows, schedule.advancePayment, schedule.regularTotal);
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
  return finishSchedule(
    rows,
    round2(parts.reduce((sum, p) => sum + p.schedule.advancePayment, 0)),
    parts.reduce((sum, p) => sum + p.schedule.regularTotal, 0),
  );
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
      const first = buildInstallmentSchedule(item)?.rows[0]?.amount ?? item.regularPrice;
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
