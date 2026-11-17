/**
 * Current LG Subscribe promotion (popup + landing page). The module keeps its Subscribe Day name,
 * but the campaign is now "ฉลองครบรอบ 2 ปี": 16–30 November 2569 (2026), Asia/Bangkok, ending at
 * midnight on 1 December.
 */
export const SUBSCRIBE_DAY_START = "2026-11-16T00:00:00+07:00";
export const SUBSCRIBE_DAY_END = "2026-12-01T00:00:00+07:00";

export const subscribeDayCampaign = {
  image: "/images/campaigns/lg-subscribe-2nd-anniversary-2026-11.webp",
  imageWidth: 1254,
  imageHeight: 1254,
  path: "/subscribe-anniversary/",
  /** Path used by the previous promotion and older ads; it forwards to `path` while active. */
  legacyPath: "/subscribe-day/",
  maxDiscountPercent: 10,
  dateLabel: "16 พ.ย.69 – 30 พ.ย.69",
  ctaLabel: "กดปุ่มนี้เพื่อแอดไลน์รับโปรโมชั่น",
  dialogLabel: "โปรโมชัน LG Subscribe ฉลองครบรอบ 2 ปี",
  closeLabel: "ปิดโปรโมชัน LG Subscribe ฉลองครบรอบ 2 ปี",
  alt: "LG Subscribe ฉลองครบรอบ 2 ปี ยิ่งซับ ยิ่งฟิน ลุ้นบินมัลดีฟส์ ลูกค้าเก่า เมื่อ Subscribe ตั้งแต่ 1 เครื่องขึ้นไป ลดเพิ่ม 10% ลูกค้าใหม่ เมื่อ Subscribe ตั้งแต่ 2 เครื่องขึ้นไป ลดเพิ่ม 10% โปรโมชัน 16 พ.ย. 69 – 30 พ.ย. 69 เงื่อนไขเป็นไปตามที่บริษัทฯ กำหนด เฉพาะรุ่นที่ร่วมรายการ",
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
