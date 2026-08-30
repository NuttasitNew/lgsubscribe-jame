import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloatingSubscribeDay } from "@/components/floating-subscribe-day";
import { subscribeDayPopupStorageKey } from "@/lib/subscribe-day";
import { siteConfig } from "@/lib/site";

const promoName =
  "LG Subscribe Day 28 สิงหาคม – 6 กันยายน 2569 ลด 15% ทุกรอบบิล ลูกค้าใหม่ตั้งแต่ 2 เครื่อง ลูกค้าเก่าตั้งแต่ 1 เครื่อง สอบถามใน LINE";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.useRealTimers();
});

describe("FloatingSubscribeDay", () => {
  it("opens the campaign popup on a first visit during Subscribe Day and sends people to LINE OA", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-29T11:26:00+07:00"));
    const user = userEvent.setup();
    render(<FloatingSubscribeDay />);

    expect(await screen.findByRole("dialog", { name: "โปรโมชัน LG Subscribe Day" })).toBeInTheDocument();

    const promo = screen.getByRole("link", { name: promoName });
    expect(promo).toHaveAttribute("href", siteConfig.lineUrl);
    expect(promo).toHaveAttribute("target", "_blank");

    const cta = screen.getByRole("link", { name: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น" });
    expect(cta).toHaveAttribute("href", siteConfig.lineUrl);
    expect(cta).toHaveAttribute("target", "_blank");

    await user.click(screen.getByRole("button", { name: "ปิดโปรโมชัน LG Subscribe Day" }));
    expect(screen.queryByRole("dialog", { name: "โปรโมชัน LG Subscribe Day" })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(subscribeDayPopupStorageKey)).toBe("1");
  });

  it("does not reopen the popup after the visitor has already closed it during the same visit", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-29T11:26:00+07:00"));
    window.sessionStorage.setItem(subscribeDayPopupStorageKey, "1");
    render(<FloatingSubscribeDay />);

    await vi.waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "โปรโมชัน LG Subscribe Day" })).not.toBeInTheDocument();
    });
  });

  it("reopens the popup on a new visit even if a previous visit closed it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-29T11:26:00+07:00"));
    window.localStorage.setItem(subscribeDayPopupStorageKey, "1");
    render(<FloatingSubscribeDay />);

    expect(await screen.findByRole("dialog", { name: "โปรโมชัน LG Subscribe Day" })).toBeInTheDocument();
  });

  it("does not show the campaign popup outside the campaign window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-07T00:00:00+07:00"));
    render(<FloatingSubscribeDay />);

    await vi.waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "โปรโมชัน LG Subscribe Day" })).not.toBeInTheDocument();
    });
  });
});
