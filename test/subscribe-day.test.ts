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

describe("Halloween LG Subscribe Day window", () => {
  it.each([
    ["2026-10-30T23:59:59.999+07:00", false],
    ["2026-10-31T00:00:00+07:00", true],
    ["2026-10-31T14:05:00+07:00", true],
    ["2026-11-05T19:56:00+07:00", true],
    ["2026-11-11T23:59:59.999+07:00", true],
    ["2026-11-12T00:00:00+07:00", false],
  ])("has the expected visibility at %s", (timestamp, active) => {
    expect(isSubscribeDayActive(new Date(timestamp))).toBe(active);
  });

  it("uses Thailand offsets independent of the visitor's local timezone", () => {
    expect(SUBSCRIBE_DAY_START).toBe("2026-10-31T00:00:00+07:00");
    expect(SUBSCRIBE_DAY_END).toBe("2026-11-12T00:00:00+07:00");
    expect(isSubscribeDayActive(new Date("2026-10-30T17:00:00.000Z"))).toBe(
      true,
    );
    expect(isSubscribeDayActive(new Date("2026-11-11T17:00:00.000Z"))).toBe(
      false,
    );
  });

  it("keeps the original Halloween artwork on a campaign-specific public path", () => {
    expect(subscribeDayCampaign.image).toBe(
      "/images/campaigns/lg-subscribe-day-halloween-2026-10.webp",
    );
    expect(
      existsSync(join(process.cwd(), "public", subscribeDayCampaign.image)),
    ).toBe(true);
    expect(subscribeDayCampaign.maxDiscountPercent).toBe(15);
    expect(subscribeDayCampaign.dateLabel).toBe("31 ต.ค.69 – 11 พ.ย.69");
    expect(subscribeDayCampaign.alt).toContain("31 ต.ค. 69 – 11 พ.ย. 69");
    expect(subscribeDayCampaign.alt).toContain("ลด 15%");
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
