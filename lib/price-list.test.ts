import { describe, expect, it } from "vitest";
import {
  applyComboDiscount,
  buildInstallmentSchedule,
  combineSchedules,
  findCombo,
  searchModels,
  buildYearlySummary,
  contractLabel,
  getPriceList,
  groupByModel,
  type PriceListItem,
} from "./price-list";

const base: PriceListItem = {
  id: "t",
  page: 1,
  category: "ตู้เย็น",
  saleType: "Subscription",
  model: "TEST",
  details: [],
  contract: "5Y_Visit",
  contractMonths: 60,
  serviceCycle: "ทุกๆ 12 เดือน",
  regularPrice: 849,
  advancePayment: null,
  advanceMonths: 1,
  paymentTerms: "",
  promotion: [],
  bills: [
    { from: 1, to: 1, amount: 149 },
    { from: 2, to: 12, amount: 424 },
    { from: 13, to: 60, amount: 849 },
  ],
  promoPrice: null,
  discount: null,
  policy: "",
  image: null,
  controlStock: false,
};

describe("buildInstallmentSchedule", () => {
  it("follows the PDF bill ranges and totals the contract", () => {
    const s = buildInstallmentSchedule(base)!;
    expect(s.rows.map((r) => [r.from, r.to, r.amount])).toEqual([
      [1, 1, 149],
      [2, 12, 424],
      [13, 60, 849],
    ]);
    expect(s.total).toBe(149 + 11 * 424 + 48 * 849);
    expect(s.savings).toBe(60 * 849 - s.total);
  });

  it("fills missing months with the regular price", () => {
    const s = buildInstallmentSchedule({ ...base, bills: [{ from: 1, to: 9, amount: 99 }] })!;
    expect(s.rows.map((r) => [r.from, r.to, r.amount])).toEqual([
      [1, 9, 99],
      [10, 60, 849],
    ]);
  });

  it("uses the regular price for the whole contract when there is no promotion", () => {
    const s = buildInstallmentSchedule({ ...base, bills: [] })!;
    expect(s.rows).toHaveLength(1);
    expect(s.total).toBe(60 * 849);
    expect(s.savings).toBe(0);
  });

  it("adds the advance payment on top of the bills (PDF example: OLED83C6)", () => {
    const s = buildInstallmentSchedule({
      ...base,
      contract: "No Service / 5Y",
      regularPrice: 2999,
      advancePayment: 8994,
      bills: [
        { from: 1, to: 6, amount: 1499 },
        { from: 7, to: 12, amount: 1500 },
        { from: 13, to: 60, amount: 2999 },
      ],
    })!;
    expect(s.total).toBe(170940);
    expect(s.savings).toBe(9000);
  });

  it("makes the advance the first bill (paid on contract day)", () => {
    const s = buildInstallmentSchedule({
      ...base,
      regularPrice: 749,
      advancePayment: 2244,
      bills: [{ from: 1, to: 12, amount: 374.5 }],
    })!;
    expect(s.rows[0].amount).toBe(374);
    expect(s.firstBill).toBe(2244);
    expect(buildInstallmentSchedule(base)!.firstBill).toBe(buildInstallmentSchedule(base)!.rows[0].amount);
  });

  it("adds each contract's first bill in an order: advance + the other's bill 1 (2,244 + 149)", () => {
    const withAdvance = buildInstallmentSchedule({
      ...base,
      regularPrice: 749,
      advancePayment: 2244,
      bills: [{ from: 1, to: 12, amount: 374.5 }],
    })!;
    const plain = buildInstallmentSchedule({ ...base, regularPrice: 149, bills: [] })!;
    const order = combineSchedules([
      { schedule: withAdvance, regularPrice: 749 },
      { schedule: plain, regularPrice: 149 },
    ])!;
    expect(order.firstBill).toBe(2244 + 149);
  });

  it("returns no schedule for outright sales", () => {
    expect(buildInstallmentSchedule({ ...base, saleType: "Outright", contractMonths: 24 })).toBeNull();
  });
});

describe("averages and combos", () => {
  it("averages everything paid over the contract months", () => {
    const s = buildInstallmentSchedule(base)!;
    expect(s.averageMonthly).toBeCloseTo(s.total / 60);
    expect(s.averageMonthly).toBeLessThan(849);
  });

  it("takes the combo % off each bill after the promo (PDF p.60: 2,999 − 1,499 − 225 = 1,275)", () => {
    const s = buildInstallmentSchedule({
      ...base,
      regularPrice: 2999,
      bills: [{ from: 1, to: 12, amount: 1500 }],
    })!;
    const combo = applyComboDiscount(s, 15);
    expect(combo.rows.map((r) => [r.from, r.to, r.amount])).toEqual([
      [1, 12, 1275],
      [13, 60, 2549],
    ]);
    expect(combo.regularTotal).toBe(s.regularTotal);
  });

  it("keeps the advance pay-back out of the combo % (PDF p.60: total 145,296)", () => {
    const s = buildInstallmentSchedule({
      ...base,
      contract: "No Service / 5Y",
      regularPrice: 2999,
      advancePayment: 8994,
      bills: [
        { from: 1, to: 6, amount: 1500 },
        { from: 7, to: 12, amount: 1500 },
        { from: 13, to: 60, amount: 2999 },
      ],
    })!;
    expect(s.rows.map((r) => r.advanceDeduction ?? 0)).toEqual([0, 1499, 0]);
    const combo = applyComboDiscount(s, 15);
    expect(combo.rows.map((r) => [r.from, r.to, r.amount])).toEqual([
      [1, 6, 1275],
      [7, 12, 1050],
      [13, 60, 2549],
    ]);
    expect(combo.total).toBe(145296);
  });

  it("treats a 12-bill half price with a 6-month advance as pay-back only (27GX704A-B)", () => {
    const s = buildInstallmentSchedule({
      ...base,
      contract: "No Service / 5Y",
      regularPrice: 449,
      advancePayment: 2694,
      bills: [
        { from: 1, to: 12, amount: 224.5 },
        { from: 13, to: 60, amount: 449 },
      ],
    })!;
    // 224.50 is rounded down to 224 (every price is whole baht, rounded down per unit).
    expect(s.rows[0].amount).toBe(224);
    expect(applyComboDiscount(s, 10).rows[0].amount).toBe(179); // 449 − 10% = 404.1 → 404 − 224.5 → 179
    // Promo switched off: the pay-back stays.
    expect(
      buildInstallmentSchedule(
        { ...base, regularPrice: 449, advancePayment: 2694, bills: [{ from: 1, to: 12, amount: 224.5 }] },
        { promo: false },
      )!.rows[0].amount,
    ).toBe(224);
  });

  it("collects a fixed first bill as is and takes its combo discount off bill 2, rounded down per unit", () => {
    const a = buildInstallmentSchedule({
      ...base,
      regularPrice: 799,
      promotion: ["ราคา 99.- (1 รอบบิลแรก)"],
      bills: [{ from: 1, to: 1, amount: 99 }],
    })!;
    const b = buildInstallmentSchedule({
      ...base,
      regularPrice: 649,
      promotion: ["ราคา 149.- (1 รอบบิลแรก)"],
      bills: [{ from: 1, to: 1, amount: 149 }],
    })!;
    expect(a.fixedFirstBill).toBe(true);
    const ca = applyComboDiscount(a, 15);
    const cb = applyComboDiscount(b, 15);
    // A: 99 kept, 99 − 84.15→84 = 15 moves on; bill 2 = 799 − 15% = 679.15 → 679 − 15 = 664.
    expect(ca.rows.slice(0, 3).map((r) => [r.from, r.to, r.amount])).toEqual([
      [1, 1, 99],
      [2, 2, 664],
      [3, 60, 679],
    ]);
    // B: 149 kept, 149 − 126.65→126 = 23 moves on; bill 2 = 551.65 → 551 − 23 = 528.
    expect(cb.rows.slice(0, 2).map((r) => r.amount)).toEqual([149, 528]);
    const both = combineSchedules([
      { schedule: ca, regularPrice: 799 },
      { schedule: cb, regularPrice: 649 },
    ])!;
    expect(both.rows.slice(0, 3).map((r) => r.amount)).toEqual([248, 1192, 1230]);
    // Without a fixed-price promo, bill 1 is discounted directly.
    expect(applyComboDiscount(buildInstallmentSchedule(base)!, 15).rows[0].amount).toBe(126);
  });

  it("adds contracts of different lengths month by month", () => {
    const a = buildInstallmentSchedule(base)!;
    const b = buildInstallmentSchedule({ ...base, contractMonths: 24, regularPrice: 500, bills: [] })!;
    const both = combineSchedules([
      { schedule: a, regularPrice: 849 },
      { schedule: b, regularPrice: 500 },
    ])!;
    expect(both.months).toBe(60);
    expect(both.rows[0]).toMatchObject({ from: 1, to: 1, amount: 649, isPromotion: true });
    expect(both.rows.at(-1)).toMatchObject({ from: 25, to: 60, amount: 849, isPromotion: false });
    expect(both.total).toBe(a.total + b.total);
  });

  it("finds the combo for the date and counts units still needed", () => {
    const combos = getPriceList().combos;
    expect(combos.length).toBeGreaterThan(0);
    const newer = findCombo(combos, "new", 1, "2026-11-20");
    expect(newer.combo?.percent).toBe(10);
    expect(newer).toMatchObject({ qualifies: false, unitsNeeded: 1 });
    expect(findCombo(combos, "existing", 1, "2026-11-20").qualifies).toBe(true);
    expect(findCombo(combos, "new", 2, "2026-11-05").combo?.percent).toBe(15);
    expect(findCombo(combos, "new", 2, "2027-01-01").combo).toBeNull();
  });

  it("picks the larger discount when a campaign overlaps the PDF combo", () => {
    const combos = getPriceList().combos;
    const campaign = combos.map((c) => ({ ...c, percent: 15, from: "2026-11-21", to: "2026-11-29" }));
    const all = [...combos, ...campaign];
    expect(findCombo(all, "new", 2, "2026-11-24").combo?.percent).toBe(15);
    expect(findCombo(all, "new", 2, "2026-11-30").combo?.percent).toBe(10);
  });
});

describe("buildInstallmentSchedule promo: false", () => {
  it("bills every month at the regular fee", () => {
    const s = buildInstallmentSchedule(base, { promo: false })!;
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0]).toMatchObject({ amount: 849, months: 60, isPromotion: false });
    expect(s.savings).toBe(0);
  });
});

describe("buildYearlySummary", () => {
  it("splits the contract into 12-bill years with per-month amounts", () => {
    const years = buildYearlySummary(buildInstallmentSchedule(base)!);
    expect(years).toHaveLength(5);
    expect(years[0]).toMatchObject({ from: 1, to: 12, total: 149 + 11 * 424 });
    expect(years[0].parts.map((p) => [p.amount, p.months])).toEqual([
      [149, 1],
      [424, 11],
    ]);
    expect(years[1].parts.map((p) => [p.amount, p.months])).toEqual([[849, 12]]);
    expect(years.reduce((n, y) => n + y.total, 0)).toBe(buildInstallmentSchedule(base)!.billsTotal);
  });

  it("merges equal amounts from adjacent PDF ranges", () => {
    const years = buildYearlySummary(
      buildInstallmentSchedule({
        ...base,
        bills: [
          { from: 1, to: 6, amount: 649 },
          { from: 7, to: 12, amount: 649 },
        ],
      })!,
    );
    expect(years[0].parts.map((p) => [p.amount, p.months])).toEqual([[649, 12]]);
  });
});

describe("price list data", () => {
  it("has a schedule covering every Subscription contract month", () => {
    const { items } = getPriceList();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items.filter((i) => i.saleType === "Subscription")) {
      const s = buildInstallmentSchedule(item);
      expect(s, item.id).not.toBeNull();
      expect(
        s!.rows.reduce((n, r) => n + r.months, 0),
        item.id,
      ).toBe(item.contractMonths);
    }
  });

  it("groups options by model and labels contracts", () => {
    const models = groupByModel(getPriceList().items);
    expect(new Set(models.map((m) => m.model)).size).toBe(models.length);
    expect(contractLabel({ ...base, contract: "7Y_Self" })).toBe("7 ปี · Self");
    expect(contractLabel({ ...base, contract: "No Service / 5Y", serviceCycle: "No Service" })).toBe(
      "5 ปี · No Service",
    );
  });
});

describe("searchModels", () => {
  const models = groupByModel(getPriceList().items);
  const names = (q: string) => searchModels(models, q).map((m) => m.model);

  it("matches model codes ignoring dashes, dots and spaces", () => {
    expect(names("gv b25")[0]).toMatch(/^GV-B25/);
    expect(names("wd518")).toContain("WD516AN / WD518AN");
  });

  it("requires every word and understands everyday words", () => {
    const air = searchModels(models, "แอร์");
    expect(air.length).toBeGreaterThan(0);
    expect(air.every((m) => m.category.includes("เครื่องปรับอากาศ"))).toBe(true);
    expect(names("ทีวี oled").every((n) => /OLED/.test(n))).toBe(true);
    expect(names("ตู้เย็น zzzz")).toEqual([]);
  });

  it("searches details and promotions too", () => {
    expect(names("น้ำเงิน")).toContain("WD516AN / WD518AN");
    expect(searchModels(models, "  ")).toHaveLength(models.length);
  });
});
