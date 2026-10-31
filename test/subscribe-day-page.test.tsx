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

describe("Subscribe Day page", () => {
  it("shows the offers during the campaign", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-11T23:59:59+07:00") });
    render(await page());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("LG Subscribe Day");
    expect(screen.getByText("Subscribe 2 เครื่องขึ้นไป")).toBeTruthy();
    expect(screen.getByText("Subscribe 1 เครื่องขึ้นไป")).toBeTruthy();
  });

  it.each(["2026-10-30T23:59:59+07:00", "2026-11-12T00:00:00+07:00"])(
    "redirects home at %s",
    async (now) => {
      vi.useFakeTimers({ now: new Date(now) });
      await expect(page()).rejects.toThrow("redirect:/");
    },
  );

  it("shows products of the category in the ad keyword", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-01T12:00:00+07:00") });
    render(await page("ตู้เย็น lg รายเดือน"));
    expect(screen.getByRole("heading", { name: "ตู้เย็นแนะนำ" })).toBeTruthy();
    expect(screen.getAllByText("฿126.65")).toHaveLength(4);
    expect(screen.getAllByText("จาก ฿149 ลดอีก 15%")).toHaveLength(4);
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

  it("stays out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
