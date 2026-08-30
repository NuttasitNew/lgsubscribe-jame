/** Inclusive campaign window in Thailand time (UTC+7). Visible through 6 Sep, closed at 7 Sep 00:00. */
export const SUBSCRIBE_DAY_START = "2026-08-28T00:00:00+07:00";
export const SUBSCRIBE_DAY_END = "2026-09-07T00:00:00+07:00";

export const subscribeDayCampaign = {
  image: "/images/campaigns/lg-subscribe-day-popup.jpg",
  discountPercent: 15,
  dateLabel: "28 ส.ค.69 – 6 ก.ย.69",
  ctaLabel: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น",
  alt: "LG Subscribe Day 28 สิงหาคม – 6 กันยายน 2569 ลด 15% ทุกรอบบิล ลูกค้าใหม่ตั้งแต่ 2 เครื่อง ลูกค้าเก่าตั้งแต่ 1 เครื่อง สอบถามใน LINE",
} as const;

export const subscribeDayPopupStorageKey = `lg-subscribe-day-popup:${SUBSCRIBE_DAY_END}`;

export function isSubscribeDayActive(now: Date = new Date()): boolean {
  return now >= new Date(SUBSCRIBE_DAY_START) && now < new Date(SUBSCRIBE_DAY_END);
}

export function wasSubscribeDayPopupDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(subscribeDayPopupStorageKey) === "1";
}

export function markSubscribeDayPopupDismissed(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(subscribeDayPopupStorageKey, "1");
}
