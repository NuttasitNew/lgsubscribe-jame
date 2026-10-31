/** Thailand campaign: 31 October – 11 November 2569 (2026), ending at midnight on 12 November. */
export const SUBSCRIBE_DAY_START = "2026-10-31T00:00:00+07:00";
export const SUBSCRIBE_DAY_END = "2026-11-12T00:00:00+07:00";

export const subscribeDayCampaign = {
  image: "/images/campaigns/lg-subscribe-day-halloween-2026-10.webp",
  maxDiscountPercent: 15,
  dateLabel: "31 ต.ค.69 – 11 พ.ย.69",
  ctaLabel: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น",
  dialogLabel: "โปรโมชัน LG Subscribe Day",
  closeLabel: "ปิดโปรโมชัน LG Subscribe Day",
  alt: "LG Subscribe Day โปรโมชั่น 31 ต.ค. 69 – 11 พ.ย. 69 ลูกค้าใหม่ Subscribe 2 เครื่องขึ้นไป ลด 15% ลูกค้าเดิม Subscribe 1 เครื่องขึ้นไป ลด 15% เงื่อนไขเป็นไปตามที่บริษัทกำหนด เฉพาะรุ่นที่ร่วมรายการ",
} as const;

export const subscribeDayPopupStorageKey = `lg-subscribe-day-popup:${SUBSCRIBE_DAY_END}`;

export function isSubscribeDayActive(now: Date = new Date()): boolean {
  return (
    now >= new Date(SUBSCRIBE_DAY_START) && now < new Date(SUBSCRIBE_DAY_END)
  );
}

export function wasSubscribeDayPopupDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(subscribeDayPopupStorageKey) === "1";
  } catch {
    return false;
  }
}

export function markSubscribeDayPopupDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(subscribeDayPopupStorageKey, "1");
  } catch {
    /* The mounted popup also remembers dismissal when storage is unavailable. */
  }
}
