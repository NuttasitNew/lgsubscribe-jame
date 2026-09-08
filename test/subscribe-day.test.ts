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
  it("opens at midnight on 8 September 2026 Thailand time", () => {
    expect(isSubscribeDayActive(new Date("2026-09-07T23:59:59+07:00"))).toBe(false);
    expect(isSubscribeDayActive(new Date("2026-09-08T00:00:00+07:00"))).toBe(true);
  });

  it("stays visible through 11 September 2026 23:59 Thailand time", () => {
    expect(isSubscribeDayActive(new Date("2026-09-08T11:26:00+07:00"))).toBe(true);
    expect(isSubscribeDayActive(new Date("2026-09-11T23:59:59+07:00"))).toBe(true);
    expect(isSubscribeDayActive(new Date("2026-09-12T00:00:00+07:00"))).toBe(false);
  });

  it("uses Thailand offsets so UTC midnight does not open or close the campaign early", () => {
    expect(SUBSCRIBE_DAY_START).toBe("2026-09-08T00:00:00+07:00");
    expect(SUBSCRIBE_DAY_END).toBe("2026-09-12T00:00:00+07:00");
    expect(isSubscribeDayActive(new Date("2026-09-07T17:00:00.000Z"))).toBe(true);
    expect(isSubscribeDayActive(new Date("2026-09-11T17:00:00.000Z"))).toBe(false);
  });

  it("keeps the campaign artwork on a public path that exists on disk", () => {
    expect(subscribeDayCampaign.image).toBe("/images/campaigns/lg-99-surprise-deal-popup.jpg");
    expect(existsSync(join(process.cwd(), "public", subscribeDayCampaign.image))).toBe(true);
  });

  it("keeps the 9.9 Surprise Deal starting at 99 baht per month during the campaign window", () => {
    expect(subscribeDayCampaign.startingPrice).toBe(99);
    expect(subscribeDayCampaign.dateLabel).toBe("8 ก.ย.69 – 11 ก.ย.69");
    expect(subscribeDayCampaign.ctaLabel).toBe("กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น");
    expect(subscribeDayCampaign.alt).toContain("เริ่มต้น 99 บาทต่อเดือน");
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
