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

describe("LG Subscribe 2nd-anniversary window (21–29 Nov)", () => {
  it.each([
    ["2026-11-20T23:59:59.999+07:00", false],
    ["2026-11-21T00:00:00+07:00", true],
    ["2026-11-23T14:05:00+07:00", true],
    ["2026-11-29T23:59:59.999+07:00", true],
    ["2026-11-30T00:00:00+07:00", false],
  ])("has the expected visibility at %s", (timestamp, active) => {
    expect(isSubscribeDayActive(new Date(timestamp))).toBe(active);
  });

  it("uses Thailand offsets independent of the visitor's local timezone", () => {
    expect(SUBSCRIBE_DAY_START).toBe("2026-11-21T00:00:00+07:00");
    expect(SUBSCRIBE_DAY_END).toBe("2026-11-30T00:00:00+07:00");
    expect(isSubscribeDayActive(new Date("2026-11-20T17:00:00.000Z"))).toBe(
      true,
    );
    expect(isSubscribeDayActive(new Date("2026-11-29T17:00:00.000Z"))).toBe(
      false,
    );
  });

  it("uses the 2nd-anniversary poster on a campaign-specific public path", () => {
    expect(subscribeDayCampaign.image).toBe(
      "/images/campaigns/lg-subscribe-day-15-2026-11.webp",
    );
    expect(subscribeDayCampaign.path).toBe("/subscribe-anniversary/");
    expect(
      existsSync(join(process.cwd(), "public", subscribeDayCampaign.image)),
    ).toBe(true);
    expect(subscribeDayCampaign.maxDiscountPercent).toBe(15);
    expect(subscribeDayCampaign.dateLabel).toBe("21 พ.ย.69 – 29 พ.ย.69");
    expect(subscribeDayCampaign.alt).toContain("โปรโมชั่น 21 พ.ย. 69 – 29 พ.ย. 69");
    expect(subscribeDayCampaign.alt).toContain("ลด 15%");
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
