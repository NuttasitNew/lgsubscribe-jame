import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SubscribeDayPage, { metadata } from "@/feature/public/subscribe-day/components/subscribe-day-page";
import { getSubscribeDayProducts } from "@/feature/public/subscribe-day/subscribe-day-products";

import { getSubscriptionFirstBillPrice } from "@/lib/subscription-starting-prices";

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

const page = (kw?: string) => SubscribeDayPage({ searchParams: Promise.resolve({ kw }) });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  redirect.mockClear();
});

describe("LG Subscribe 2nd-anniversary page", () => {
  it("shows the offers during the campaign", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-29T23:59:59+07:00") });
    render(await page());
    const heading = screen.getByRole("heading", { level: 1 }).textContent;
    expect(heading).toContain("LG Subscribe");
    expect(heading).toContain("ลุ้นบินมัลดีฟส์");
    expect(heading).toContain("ลด 15%");
    expect(screen.getByText("ฉลองครบรอบ 2 ปี")).toBeTruthy();
    expect(screen.getByText(/21 พ.ย.69 – 29 พ.ย.69/)).toBeTruthy();
    const cards = screen.getAllByRole("article").map((card) => card.textContent);
    expect(cards[0]).toContain("ลูกค้าใหม่");
    expect(cards[0]).toContain("Subscribe 2 เครื่องขึ้นไป");
    expect(cards[1]).toContain("ลูกค้าเดิม");
    expect(cards[1]).toContain("Subscribe 1 เครื่องขึ้นไป");
    expect(cards.every((card) => card?.includes("ลด15%"))).toBe(true);
  });

  it.each(["2026-11-20T23:59:59+07:00", "2026-11-30T00:00:00+07:00"])(
    "redirects home at %s",
    async (now) => {
      vi.useFakeTimers({ now: new Date(now) });
      await expect(page()).rejects.toThrow("redirect:/");
    },
  );

  it("shows products of the category in the ad keyword", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-23T12:00:00+07:00") });
    render(await page("ตู้เย็น lg รายเดือน"));
    expect(screen.getByRole("heading", { name: "ตู้เย็นแนะนำ" })).toBeTruthy();
    expect(screen.getAllByText("฿126.65")).toHaveLength(4);
    expect(screen.getAllByText("จาก ฿149 ลด 15%")).toHaveLength(4);
    expect(screen.getByText("ราคาปกติ ฿399/เดือน")).toBeTruthy();
    expect(screen.getByRole("link", { name: "ดูตู้เย็นทุกรุ่น" }).getAttribute("href")).toContain(
      `?category=${encodeURIComponent("ตู้เย็น")}`,
    );
    expect(screen.getByRole("img", { name: /ก่อนติดตั้งในบ้านลูกค้า/ })).toBeTruthy();
  });

  it.each([
    ["เครื่อง ซัก ผ้า lg", "เครื่องซักผ้าและอบผ้า"],
    ["lg wash tower", "เครื่องซักผ้าและอบผ้า"],
    ["ตู้เย็นรายเดือน", "ตู้เย็น"],
    ["ผ่อนแอร์ lg", "เครื่องปรับอากาศ"],
    ["เครื่องกรองน้ำ lg", "เครื่องกรองน้ำ"],
    ["เครื่องฟอกอากาศ lg", "เครื่องฟอกอากาศ"],
    ["lg oled", "ทีวีและเครื่องเสียง"],
  ])("maps %s to %s", (keyword, category) => {
    const { products } = getSubscribeDayProducts(keyword);
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => product.category === category)).toBe(true);
  });

  it.each([undefined, "lg subscribe", "lg subscribe คือ"])("falls back to one product per top category for %s", (keyword) => {
    const { label, products } = getSubscribeDayProducts(keyword);
    expect(label).toBeNull();
    expect(products.map((product) => product.category)).toEqual([
      "เครื่องซักผ้าและอบผ้า",
      "ตู้เย็น",
      "เครื่องกรองน้ำ",
      "เครื่องปรับอากาศ",
    ]);
  });

  it("reads first-bill prices from the price list", () => {
    expect(getSubscriptionFirstBillPrice("WD110MN")).toBe(99);
    expect(getSubscriptionFirstBillPrice("WT1410NHEG")).toBe(149);
    expect(getSubscriptionFirstBillPrice("NOT-A-MODEL")).toBeNull();
  });

  it("shows the Maldives headline as LG's campaign without inventing draw rules", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-23T12:00:00+07:00") });
    render(await page());
    const maldives = screen.getByRole("heading", { name: /ลุ้นบินมัลดีฟส์/, level: 2 });
    const card = maldives.parentElement!;
    expect(card.textContent).toContain("เงื่อนไขเป็นไปตามที่บริษัทฯ กำหนด");
    expect(card.textContent).not.toMatch(/รางวัล\s*\d|จำนวน|วิธีร่วมสนุก/);
    expect(screen.getByText(/ไม่ใช่ LG Electronics/)).toBeTruthy();
  });

  it("uses the campaign dates in the page metadata", () => {
    expect(String(metadata.title)).toContain("21–29 พ.ย. 69");
    expect(metadata.description).toContain("ฉลองครบรอบ 2 ปี");
  });

  it("stays out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});

describe("legacy /subscribe-day/ path", () => {
  it("forwards to the current campaign page with the ad keyword", async () => {
    const { default: LegacyPage } = await import("@/app/(public)/subscribe-day/page");
    vi.useFakeTimers({ now: new Date("2026-11-23T12:00:00+07:00") });
    await expect(LegacyPage({ searchParams: Promise.resolve({ kw: "ตู้เย็น lg" }) })).rejects.toThrow(
      `redirect:/subscribe-anniversary/?kw=${encodeURIComponent("ตู้เย็น lg").replace(/%20/g, "+")}`,
    );
  });

  it("sends visitors home outside the campaign", async () => {
    const { default: LegacyPage } = await import("@/app/(public)/subscribe-day/page");
    vi.useFakeTimers({ now: new Date("2026-11-30T00:00:00+07:00") });
    await expect(LegacyPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/");
  });
});
