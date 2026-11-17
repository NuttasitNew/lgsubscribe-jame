import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSubscribeDayActive,
  markSubscribeDayPopupDismissed,
  subscribeDayCampaign,
  subscribeDayPopupStorageKey,
  SUBSCRIBE_DAY_END,
  SUBSCRIBE_DAY_START,
  wasSubscribeDayPopupDismissed,
} from "@/lib/subscribe-day";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("LG Subscribe 2nd-anniversary window (16–30 Nov)", () => {
  it.each([
    ["2026-11-15T23:59:59.999+07:00", false],
    ["2026-11-16T00:00:00+07:00", true],
    ["2026-11-17T14:05:00+07:00", true],
    ["2026-11-30T23:59:59.999+07:00", true],
    ["2026-12-01T00:00:00+07:00", false],
  ])("has the expected visibility at %s", (timestamp, active) => {
    expect(isSubscribeDayActive(new Date(timestamp))).toBe(active);
  });

  it("uses Thailand offsets independent of the visitor's local timezone", () => {
    expect(SUBSCRIBE_DAY_START).toBe("2026-11-16T00:00:00+07:00");
    expect(SUBSCRIBE_DAY_END).toBe("2026-12-01T00:00:00+07:00");
    expect(isSubscribeDayActive(new Date("2026-11-15T17:00:00.000Z"))).toBe(
      true,
    );
    expect(isSubscribeDayActive(new Date("2026-11-30T17:00:00.000Z"))).toBe(
      false,
    );
  });

  it("uses the 2nd-anniversary poster on a campaign-specific public path", () => {
    expect(subscribeDayCampaign.image).toBe(
      "/images/campaigns/lg-subscribe-2nd-anniversary-2026-11.webp",
    );
    expect(subscribeDayCampaign.path).toBe("/subscribe-anniversary/");
    expect(
      existsSync(join(process.cwd(), "public", subscribeDayCampaign.image)),
    ).toBe(true);
    expect(subscribeDayCampaign.maxDiscountPercent).toBe(10);
    expect(subscribeDayCampaign.dateLabel).toBe("16 พ.ย.69 – 30 พ.ย.69");
    expect(subscribeDayCampaign.alt).toContain("โปรโมชัน 16 พ.ย. 69 – 30 พ.ย. 69");
    expect(subscribeDayCampaign.alt).toContain("ลดเพิ่ม 10%");
    expect(subscribeDayCampaign.alt).toContain("ลุ้นบินมัลดีฟส์");
  });

  it("remembers a closed popup only for the current website session", () => {
    expect(wasSubscribeDayPopupDismissed()).toBe(false);
    markSubscribeDayPopupDismissed();
    expect(window.sessionStorage.getItem(subscribeDayPopupStorageKey)).toBe(
      "1",
    );
    expect(window.localStorage.getItem(subscribeDayPopupStorageKey)).toBeNull();
    expect(wasSubscribeDayPopupDismissed()).toBe(true);
  });

  it("ignores the September campaign's dismissal and previous-session local storage", () => {
    window.sessionStorage.setItem(
      "lg-subscribe-day-popup:2026-09-21T00:00:00+07:00",
      "1",
    );
    window.localStorage.setItem(subscribeDayPopupStorageKey, "1");
    expect(wasSubscribeDayPopupDismissed()).toBe(false);

    markSubscribeDayPopupDismissed();
    window.sessionStorage.clear();
    expect(wasSubscribeDayPopupDismissed()).toBe(false);
  });

  it("handles disabled browser storage without throwing", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });
    expect(wasSubscribeDayPopupDismissed()).toBe(false);
    expect(() => markSubscribeDayPopupDismissed()).not.toThrow();
  });
});
