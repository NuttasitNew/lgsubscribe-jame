/**
 * @description Build an inclusive 28-day UTC date window ending at the latest imported GSC date.
 * @logic No rows falls back to the final-data lag; never include a fractional first day.
 * @used-by SEO article metrics actions and category grounding
 */
export const seoMetricWindow = (latest: Date | null, now = new Date()) => {
  const end = latest ? new Date(latest) : new Date(now.getTime() - 3 * 86400000);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 27 * 86400000);
  return { start, end, startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
};
