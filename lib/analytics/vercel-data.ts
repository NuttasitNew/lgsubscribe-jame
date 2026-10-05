// Vercel groups days at UTC midnight. Keep its aggregate dates intact rather than
// shifting an already aggregated day into Bangkok or summing daily unique users.
export type VercelDay = { day: string; visitors: number; pageviews: number };
export type VercelPeriod = { start: string; end: string; visitors: number; pageviews: number };
export type VercelHistory = {
  projectId: string;
  start: string;
  end: string;
  asOf: string;
  days: VercelDay[];
  periods: VercelPeriod[];
};
function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number(value.slice(0, 4)) >= 2000 &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
function metric(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 2147483647)
    throw new Error("Invalid Vercel traffic metric");
  return value;
}
export function parseVercelDays(raw: unknown, start: string, end: string): VercelDay[] {
  if (!validDay(start) || !validDay(end) || start > end) throw new Error("Invalid Vercel traffic range");
  const response = raw as { data?: Record<string, unknown>[]; query?: { since?: string; until?: string } };
  if (
    !response ||
    !Array.isArray(response.data) ||
    response.data.length > 367 ||
    !response.query?.since ||
    !response.query.until
  )
    throw new Error("Invalid Vercel daily response");
  if (
    !Number.isFinite(Date.parse(response.query.since)) ||
    !Number.isFinite(Date.parse(response.query.until))
  )
    throw new Error("Invalid Vercel query timestamp");
  if (
    Date.parse(response.query.since) > Date.parse(`${start}T00:00:00Z`) ||
    Date.parse(response.query.until) < Date.parse(`${end}T23:59:59Z`)
  )
    throw new Error("Vercel query did not cover requested days");
  const seen = new Set<string>();
  return response.data
    .map((row) => {
      if (typeof row.timestamp !== "string" || !/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(row.timestamp))
        throw new Error("Invalid Vercel day timestamp");
      const day = row.timestamp.slice(0, 10);
      if (!validDay(day) || seen.has(day)) throw new Error("Duplicate or invalid Vercel day");
      seen.add(day);
      return { day, visitors: metric(row.visitors), pageviews: metric(row.pageviews) };
    })
    .filter(({ day }) => day >= start && day <= end)
    .sort((a, b) => a.day.localeCompare(b.day));
}
export function parseVercelPeriod(raw: unknown, start: string, end: string) {
  const response = raw as { data?: Record<string, unknown>[]; query?: { since?: string; until?: string } };
  if (
    !validDay(start) ||
    !validDay(end) ||
    start > end ||
    !response ||
    !Array.isArray(response.data) ||
    response.data.length !== 1 ||
    response.data[0].environment !== "production"
  )
    throw new Error("Invalid Vercel period response");
  if (
    !response.query?.since ||
    !response.query.until ||
    Date.parse(response.query.since) !== Date.parse(`${start}T00:00:00Z`) ||
    Date.parse(response.query.until) !== Date.parse(`${end}T00:00:00Z`) + 86400000
  )
    throw new Error("Vercel period bounds do not match");
  return {
    start,
    end,
    visitors: metric(response.data[0].visitors),
    pageviews: metric(response.data[0].pageviews),
  };
}
export function summarizeVercelDays(
  rows: VercelDay[],
  start: string,
  end: string,
  periods: VercelHistory["periods"],
) {
  const selected = rows.filter((row) => row.day >= start && row.day <= end);
  // Never replace missing unique-period counts with a sum or with another source.
  const effectiveEnd = selected.at(-1)?.day;
  const period = periods.find((p) => p.start === start && p.end === effectiveEnd);
  return {
    rows: selected,
    visitors: period?.visitors ?? null,
    pageviews: selected.reduce((total, row) => total + row.pageviews, 0),
    first: selected[0]?.day ?? null,
    last: effectiveEnd ?? null,
  };
}
