/** Thailand campaign: 1–31 October 2569 (2026), ending at midnight on 1 November. */
export const WATER_PURIFIER_PROMO_END = "2026-11-01T00:00:00+07:00";

export function isWaterPurifierPromoActive(now: Date = new Date()): boolean {
  return now < new Date(WATER_PURIFIER_PROMO_END);
}
