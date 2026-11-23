/**
 * Current LG Subscribe promotion (popup + landing page). The module keeps its Subscribe Day name,
 * but the campaign is now Subscribe Day "ฉลองครบรอบ 2 ปี" ลด 15%: 21–29 November 2569 (2026),
 * Asia/Bangkok, ending at midnight on 30 November.
 */
export const SUBSCRIBE_DAY_START = "2026-11-21T00:00:00+07:00";
export const SUBSCRIBE_DAY_END = "2026-11-30T00:00:00+07:00";

export const subscribeDayCampaign = {
  image: "/images/campaigns/lg-subscribe-day-15-2026-11.webp",
  imageWidth: 1087,
  imageHeight: 1447,
  path: "/subscribe-anniversary/",
  /** Path used by the previous promotion and older ads; it forwards to `path` while active. */
  legacyPath: "/subscribe-day/",
  maxDiscountPercent: 15,
  dateLabel: "21 พ.ย.69 – 29 พ.ย.69",
  ctaLabel: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น",
  dialogLabel: "โปรโมชัน LG Subscribe ฉลองครบรอบ 2 ปี",
  closeLabel: "ปิดโปรโมชัน LG Subscribe ฉลองครบรอบ 2 ปี",
  alt: "LG Subscribe Day ฉลองครบรอบ 2 ปี ยิ่งซับ ยิ่งฟิน ลุ้นบินมัลดีฟส์ ลูกค้าใหม่ Subscribe 2 เครื่องขึ้นไป ลด 15% ลูกค้าเดิม Subscribe 1 เครื่องขึ้นไป ลด 15% โปรโมชั่น 21 พ.ย. 69 – 29 พ.ย. 69 เงื่อนไขเป็นไปตามที่บริษัทฯ กำหนด เฉพาะรุ่นที่ร่วมรายการ",
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
