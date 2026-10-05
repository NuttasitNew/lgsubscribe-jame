import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { bangkokToday, dateRange, monthRange } from "@/lib/analytics/date-range";
import { AnalyticsDateFilters } from "@/feature/backoffice/components/analytics-date-filters";
import { GoogleReports } from "@/feature/backoffice/components/google-reports";
export const metadata = { title: "Google Ads / GA4" };
export default async function GooglePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireBackofficeSession("google.view");
  const params = await searchParams;
  const today = bangkokToday();
  let range = dateRange(monthRange(today.slice(0, 7)).start, today);
  let error = "";
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  try {
    if (value("start") || value("end")) range = dateRange(value("start") ?? "", value("end") ?? "");
    else if (value("month")) {
      const month = monthRange(value("month")!);
      range = dateRange(month.start, month.end);
    }
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "ช่วงเวลาไม่ถูกต้อง";
  }
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold">Google Ads / GA4</h1>
        <p className="mt-2 text-sm text-slate-500">รายงานรายวันและข้อมูลย้อนหลังจาก Google · เวลาไทย</p>
      </header>
      <section className="rounded-xl border bg-white p-4">
        <AnalyticsDateFilters
          key={`${range.start}:${range.end}`}
          start={range.start}
          end={range.end}
          today={today}
          action="/backoffice/google/"
        />
      </section>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : (
        <GoogleReports range={range} />
      )}
    </main>
  );
}
