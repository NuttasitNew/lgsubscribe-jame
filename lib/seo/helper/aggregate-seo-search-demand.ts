import { normalizeSearchTerm } from "./normalize-search-term";

/**
 * @description Merge search-query spelling variants and calculate impression-weighted organic positions.
 * @logic Keep Ads impressions (90 days) separate from organic impressions (28 days); neither is market volume.
 * @used-by build-category-grounding.helper.ts
 */
export const aggregateSeoSearchDemand = (
  ads: { keyword: string; impressions: number }[],
  organic: { query: string; impressions: number; position: number }[],
  taken: Set<string>
) => {
  const rows = new Map<string, { adImpressions: number; impressions: number; weight: number }>();
  for (const row of ads) {
    const keyword = normalizeSearchTerm(row.keyword);
    if (!keyword) continue;
    const current = rows.get(keyword) ?? { adImpressions: 0, impressions: 0, weight: 0 };
    current.adImpressions += row.impressions;
    rows.set(keyword, current);
  }
  for (const row of organic) {
    const keyword = normalizeSearchTerm(row.query);
    if (!keyword) continue;
    const current = rows.get(keyword) ?? { adImpressions: 0, impressions: 0, weight: 0 };
    current.impressions += row.impressions;
    current.weight += row.position * row.impressions;
    rows.set(keyword, current);
  }
  return [...rows].map(([keyword, row]) => ({
    keyword,
    impressions: row.impressions,
    adImpressions: row.adImpressions,
    organicPosition: row.impressions > 0 ? Math.round((row.weight / row.impressions) * 10) / 10 : null,
    hasArticle: taken.has(keyword),
  }));
};
