/** Inclusive campaign window in Thailand time (UTC+7). Visible through 11 Sep 23:59, closed at 12 Sep 00:00. */
export const SUBSCRIBE_DAY_START = "2026-09-08T00:00:00+07:00";
export const SUBSCRIBE_DAY_END = "2026-09-12T00:00:00+07:00";

export const subscribeDayCampaign = {
  image: "/images/campaigns/lg-99-surprise-deal-popup.jpg",
  startingPrice: 99,
  dateLabel: "8 ก.ย.69 – 11 ก.ย.69",
  ctaLabel: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น",
  dialogLabel: "โปรโมชัน 9.9 Surprise Deal",
  closeLabel: "ปิดโปรโมชัน 9.9 Surprise Deal",
  alt: "LG Subscribe 9.9 Surprise Deal 8–11 กันยายน 2569 เริ่มต้น 99 บาทต่อเดือน สอบถามใน LINE",
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
