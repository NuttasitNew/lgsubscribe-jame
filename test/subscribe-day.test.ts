import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("LG Subscribe Day window", () => {
  it("opens at midnight on 28 August 2026 Thailand time", () => {
    expect(isSubscribeDayActive(new Date("2026-08-27T23:59:59+07:00"))).toBe(false);
    expect(isSubscribeDayActive(new Date("2026-08-28T00:00:00+07:00"))).toBe(true);
  });

  it("stays visible through 6 September 2026 Thailand time", () => {
    expect(isSubscribeDayActive(new Date("2026-08-29T11:26:00+07:00"))).toBe(true);
    expect(isSubscribeDayActive(new Date("2026-09-06T23:59:59+07:00"))).toBe(true);
    expect(isSubscribeDayActive(new Date("2026-09-07T00:00:00+07:00"))).toBe(false);
  });

  it("uses Thailand offsets so UTC midnight does not open or close the campaign early", () => {
    expect(SUBSCRIBE_DAY_START).toBe("2026-08-28T00:00:00+07:00");
    expect(SUBSCRIBE_DAY_END).toBe("2026-09-07T00:00:00+07:00");
    expect(isSubscribeDayActive(new Date("2026-08-27T17:00:00.000Z"))).toBe(true);
    expect(isSubscribeDayActive(new Date("2026-09-06T17:00:00.000Z"))).toBe(false);
  });

  it("keeps the campaign artwork on a public path that exists on disk", () => {
    expect(subscribeDayCampaign.image).toBe("/images/campaigns/lg-subscribe-day-popup.jpg");
    expect(existsSync(join(process.cwd(), "public", subscribeDayCampaign.image))).toBe(true);
  });

  it("keeps the Subscribe Day offer at 15% off during the campaign window", () => {
    expect(subscribeDayCampaign.discountPercent).toBe(15);
    expect(subscribeDayCampaign.dateLabel).toBe("28 ส.ค.69 – 6 ก.ย.69");
    expect(subscribeDayCampaign.ctaLabel).toBe("กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น");
    expect(subscribeDayCampaign.alt).toContain("ลด 15%");
  });

  it("remembers a closed popup only for the current website visit", () => {
    expect(wasSubscribeDayPopupDismissed()).toBe(false);
    markSubscribeDayPopupDismissed();
    expect(window.sessionStorage.getItem(subscribeDayPopupStorageKey)).toBe("1");
    expect(window.localStorage.getItem(subscribeDayPopupStorageKey)).toBeNull();
    expect(wasSubscribeDayPopupDismissed()).toBe(true);
  });

  it("shows the popup again on a new visit even if a previous visit closed it", () => {
    window.localStorage.setItem(subscribeDayPopupStorageKey, "1");
    expect(wasSubscribeDayPopupDismissed()).toBe(false);

    markSubscribeDayPopupDismissed();
    window.sessionStorage.clear();
    expect(wasSubscribeDayPopupDismissed()).toBe(false);
  });
});
