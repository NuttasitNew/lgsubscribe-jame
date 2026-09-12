/** Inclusive campaign window in Thailand time (UTC+7). Visible through 20 Sep 23:59, closed at 21 Sep 00:00. */
export const SUBSCRIBE_DAY_START = "2026-09-12T00:00:00+07:00";
export const SUBSCRIBE_DAY_END = "2026-09-21T00:00:00+07:00";

export const subscribeDayCampaign = {
  image: "/images/campaigns/lg-subscribe-day-popup.jpg",
  discountPercent: 15,
  dateLabel: "12 ก.ย.69 – 20 ก.ย.69",
  ctaLabel: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น",
  dialogLabel: "โปรโมชัน LG Subscribe Day",
  closeLabel: "ปิดโปรโมชัน LG Subscribe Day",
  alt: "LG Subscribe Day 12–20 กันยายน 2569 ลด 15% ทุกรอบบิล ลูกค้าใหม่ตั้งแต่ 2 เครื่อง ลูกค้าเก่าตั้งแต่ 1 เครื่อง สอบถามใน LINE",
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
