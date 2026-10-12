import { renderToString } from "react-dom/server";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingSubscribeDay } from "@/components/floating-subscribe-day";
import {
  subscribeDayCampaign,
  subscribeDayPopupStorageKey,
  SUBSCRIBE_DAY_END,
  SUBSCRIBE_DAY_START,
} from "@/lib/subscribe-day";
import { setTrackingConsent } from "@/lib/analytics/consent";
import { siteConfig } from "@/lib/site";

const dialogName = "โปรโมชัน LG Subscribe Day";
const closeName = "ปิดโปรโมชัน LG Subscribe Day";
const duringCampaign = "2026-10-03T11:26:00+07:00";

beforeEach(() => {
  window.localStorage.setItem("lg_tracking_consent_v1", "necessary");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.useRealTimers();
});

function setDate(timestamp: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(timestamp));
}

describe("FloatingSubscribeDay", () => {
  it("keeps server HTML closed even when generated during the promotion", () => {
    setDate(duringCampaign);
    const html = renderToString(<FloatingSubscribeDay />);
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain(subscribeDayCampaign.image);
  });

  it("waits for the cookie banner to be answered before opening", async () => {
    setDate(duringCampaign);
    window.localStorage.removeItem("lg_tracking_consent_v1");
    render(<FloatingSubscribeDay />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      setTrackingConsent("necessary");
    });
    expect(await screen.findByRole("dialog", { name: dialogName })).toBeInTheDocument();
  });

  it("opens with the original artwork and existing LINE contact links", async () => {
    setDate(duringCampaign);
    const user = userEvent.setup();
    render(<FloatingSubscribeDay />);

    expect(
      await screen.findByRole("dialog", { name: dialogName }),
    ).toBeInTheDocument();
    const promo = screen.getByRole("link", { name: subscribeDayCampaign.alt });
    expect(promo).toHaveAttribute("href", siteConfig.lineUrl);
    expect(promo).toHaveAttribute("target", "_blank");
    expect(
      screen.getByRole("img", { name: subscribeDayCampaign.alt }),
    ).toHaveAttribute("src", subscribeDayCampaign.image);
    expect(
      screen.getByRole("img", { name: subscribeDayCampaign.alt }),
    ).not.toHaveAttribute("srcset");
    expect(
      screen.getByRole("link", { name: subscribeDayCampaign.ctaLabel }),
    ).toHaveAttribute("href", siteConfig.lineUrl);

    await user.click(screen.getByRole("button", { name: closeName }));
    expect(
      screen.queryByRole("dialog", { name: dialogName }),
    ).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(subscribeDayPopupStorageKey)).toBe(
      "1",
    );
  });

  it("does not reopen after close, focus changes, or a navigation remount in the same session", async () => {
    setDate(duringCampaign);
    const user = userEvent.setup();
    const { unmount } = render(<FloatingSubscribeDay />);
    await user.click(await screen.findByRole("button", { name: closeName }));
    fireEvent.focus(window);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    unmount();
    render(<FloatingSubscribeDay />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open when this campaign was dismissed before hydration", () => {
    setDate(duringCampaign);
    window.sessionStorage.setItem(subscribeDayPopupStorageKey, "1");
    render(<FloatingSubscribeDay />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens again in a new session and ignores September's dismissal", async () => {
    setDate(duringCampaign);
    window.localStorage.setItem(subscribeDayPopupStorageKey, "1");
    window.sessionStorage.setItem(
      "lg-subscribe-day-popup:2026-09-21T00:00:00+07:00",
      "1",
    );
    const { unmount } = render(<FloatingSubscribeDay />);
    expect(
      await screen.findByRole("dialog", { name: dialogName }),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: closeName }));
    unmount();
    window.sessionStorage.clear();
    render(<FloatingSubscribeDay />);
    expect(
      await screen.findByRole("dialog", { name: dialogName }),
    ).toBeInTheDocument();
  });

  it.each(["2026-10-02T23:59:59.999+07:00", SUBSCRIBE_DAY_END])(
    "does not open outside the window at %s",
    (timestamp) => {
      setDate(timestamp);
      render(<FloatingSubscribeDay />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  it("opens a page left open at the exact start boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(new Date(SUBSCRIBE_DAY_START).getTime() - 1));
    render(<FloatingSubscribeDay />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole("dialog", { name: dialogName }),
    ).toBeInTheDocument();
  });

  it("closes an already-open popup at the exact end boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(new Date(SUBSCRIBE_DAY_END).getTime() - 1));
    render(<FloatingSubscribeDay />);
    expect(
      screen.getByRole("dialog", { name: dialogName }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      window.sessionStorage.getItem(subscribeDayPopupStorageKey),
    ).toBeNull();
  });

  it("rechecks the window when a suspended page becomes visible", () => {
    setDate(duringCampaign);
    render(<FloatingSubscribeDay />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    vi.setSystemTime(new Date(SUBSCRIBE_DAY_END));
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("focuses close, traps tab navigation, closes with Escape, and restores previous focus", async () => {
    setDate(duringCampaign);
    const user = userEvent.setup();
    const { rerender } = render(
      <button type="button">กลับไปเลือกสินค้า</button>,
    );
    const previous = screen.getByRole("button", { name: "กลับไปเลือกสินค้า" });
    previous.focus();
    rerender(
      <>
        <button type="button">กลับไปเลือกสินค้า</button>
        <FloatingSubscribeDay />
      </>,
    );

    expect(
      await screen.findByRole("button", { name: closeName }),
    ).toHaveFocus();
    await user.tab({ shift: true });
    expect(
      screen.getByRole("link", { name: subscribeDayCampaign.ctaLabel }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: closeName })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(previous).toHaveFocus());
  });

  it("keeps dismissal in memory when browser storage is unavailable", async () => {
    setDate(duringCampaign);
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });
    render(<FloatingSubscribeDay />);
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: closeName }));
    fireEvent.focus(window);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
