/** Thailand campaign: 3–18 October 2569 (2026), ending at midnight on 19 October. */
export const SUBSCRIBE_DAY_START = "2026-10-03T00:00:00+07:00";
export const SUBSCRIBE_DAY_END = "2026-10-19T00:00:00+07:00";

export const subscribeDayCampaign = {
  image: "/images/campaigns/lg-subscribe-day-2026-10.jpg",
  maxDiscountPercent: 20,
  dateLabel: "3 ต.ค.69 – 18 ต.ค.69",
  ctaLabel: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น",
  dialogLabel: "โปรโมชัน LG Subscribe Day",
  closeLabel: "ปิดโปรโมชัน LG Subscribe Day",
  alt: "LG Subscribe Day ฉลองครบรอบ 2 ปี 3–18 ตุลาคม 2569 ลดสูงสุด 20% ลูกค้าใหม่ Subscribe 2 เครื่อง ลด 15% ลูกค้าเดิม Subscribe 1 เครื่อง ลด 15% เฉพาะเครื่องกรองน้ำ ลด 20% เงื่อนไขเป็นไปตามที่บริษัทกำหนด สอบถามใน LINE",
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
