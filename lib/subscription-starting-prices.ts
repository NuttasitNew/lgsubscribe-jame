import { octSubscriptionCampaignProducts } from "@/lib/oct-subscription-campaign";

/** Catalog aliases whose public model label intentionally differs from the price-list SKU. */
const campaignModelAliases: Record<string, string> = {
  QNED80B: "55QNED80BSA.ATM",
  "32U889SA": "32U889SA-W.ATM",
  GRAB: "LG xboom Grab",
  BOUNCE: "LG xboom Bounce",
  STAGE301: "LG xboom STAGE301",
};

function normalizedCampaignKey(value: string): string {
  let normalized = value.trim().toUpperCase();
  normalized = normalized.replace(/^LG\s+XBOOM\s+/, "");
  normalized = normalized.replace(/^(?:GC|GN|GV)-/, "");
  const [base, suffix] = normalized.split(".", 2);
  if (suffix && !["S30A", "S80TY", "GRAB"].includes(suffix)) normalized = base;
  return normalized.replace(/[^A-Z0-9]/g, "");
}

function findCampaignProduct(model: string) {
  if (model === "WD516AN" || model === "WD518AN") {
    return octSubscriptionCampaignProducts.find((product) => product.model === "WD516AN / WD518AN");
  }

  const campaignModel = campaignModelAliases[model] ?? model;
  const key = normalizedCampaignKey(campaignModel);
  return octSubscriptionCampaignProducts.find((product) => normalizedCampaignKey(product.model) === key);
}

export const subscriptionStartingPrices = Object.fromEntries(
  octSubscriptionCampaignProducts.map((product) => [product.model, product.monthlyPrice]),
) as Readonly<Record<string, number>>;

/** Campaign entry price used only when the exact model is unknown. */
export const categoryStartingFallbacks: Readonly<Record<string, number>> = {
  เครื่องปรับอากาศ: 149,
  เครื่องฟอกอากาศ: 149,
  เครื่องลดความชื้น: 149,
  เครื่องล้างจาน: 149,
  ไมโครเวฟ: 119,
  ตู้เย็น: 149,
  ตู้ถนอมผ้า: 149,
  ทีวีและเครื่องเสียง: 549,
  ลำโพง: 109,
  เครื่องดูดฝุ่น: 149,
  เครื่องซักผ้าและอบผ้า: 149,
  เครื่องกรองน้ำ: 149,
  จอมอนิเตอร์: 349,
};

export function getSubscriptionStartingPrice(model: string, category?: string): number | null {
  const matched = findCampaignProduct(model);
  if (matched) return matched.monthlyPrice;
  if (!category) return null;
  return categoryStartingFallbacks[category] ?? null;
}

/** Unmatched, withdrawn and paused models must not fall back into the sales catalog. */
export function isCurrentSubscriptionModel(model: string): boolean {
  return findCampaignProduct(model) !== undefined;
}
