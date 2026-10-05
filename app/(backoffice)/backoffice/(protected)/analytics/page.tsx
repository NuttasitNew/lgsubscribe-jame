import { AnalyticsDateFilters } from "@/feature/backoffice/components/analytics-date-filters";
import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { bangkokToday, dateRange, monthRange } from "@/lib/analytics/date-range";
import { VercelTraffic } from "@/feature/backoffice/components/vercel-traffic";
import { getTrafficReport } from "@/lib/analytics/report";
import { ReportTable } from "@/feature/backoffice/components/report-table";
import { TrafficBreakdown } from "@/feature/backoffice/components/traffic-breakdown";

export const metadata = { title: "สถิติผู้เข้าชมเว็บไซต์" };
const number = new Intl.NumberFormat("th-TH");
const thaiDate = (day: string) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(
    new Date(`${day}T12:00:00+07:00`),
  );

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireBackofficeSession("analytics.view");
  const params = await searchParams;
  const today = bangkokToday();
  const defaultRange = monthRange(today.slice(0, 7));
  const value = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  let range = dateRange(defaultRange.start, today);
  let error = "";
  try {
    if (value("start") || value("end")) range = dateRange(value("start") ?? "", value("end") ?? "");
    else if (value("month")) {
      const month = monthRange(value("month")!);
      range = dateRange(month.start, month.end);
    }
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "ช่วงเวลาไม่ถูกต้อง";
  }
  let report: Awaited<ReturnType<typeof getTrafficReport>> | null = null;
  let databaseError = false;
  if (!error) {
    try {
      report = await getTrafficReport(range);
    } catch {
      databaseError = true;
    }
  }
  const max = Math.max(1, ...(report?.rows.map((row) => row.visitors) ?? []));
  const firstDay = report?.firstTrackedAt ? bangkokToday(report.firstTrackedAt) : null;
  const websiteAvailable = Boolean(firstDay && range.end >= firstDay && range.start <= today);
  return (
    <main className="bg-[#eef0f2] px-4 py-6 text-[#1d1f22] sm:px-6 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#a80f28]">
              LG Subscribe · Backoffice
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">สถิติผู้เข้าชมเว็บไซต์</h1>
            <p className="mt-2 text-sm text-[#666b70]">Vercel Web Analytics</p>
          </div>
        </header>
        <section aria-label="เลือกช่วงเวลา" className="rounded-xl border border-[#d4d7da] bg-white p-4">
          <AnalyticsDateFilters
            key={`${range.start}:${range.end}`}
            start={range.start}
            end={range.end}
            today={today}
          />
        </section>
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {databaseError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อฐานข้อมูลและ migration แล้วลองอีกครั้ง
          </p>
        )}
        {!error && <VercelTraffic range={range} />}
        {report && (
          <details>
            <summary className="cursor-pointer rounded-xl border bg-white p-3 text-sm font-semibold">ข้อมูลที่เว็บไซต์เก็บเอง</summary>
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "ผู้เข้าชมไม่ซ้ำในช่วงที่เลือก", value: report.totals.visitors },
                  { label: "จำนวนการเปิดหน้า", value: report.totals.views },
                  { label: "Sessions", value: report.totals.sessions },
                  { label: "คลิกติดต่อ", value: report.totals.contactClicks },
                ].map((item) => (
                  <section
                    key={item.label}
                    className="rounded-xl border border-[#d4d7da] bg-white p-4 sm:p-5"
                  >
                    <h2 className="text-sm text-[#666b70]">{item.label}</h2>
                    <p className="mt-2 text-3xl font-semibold">
                      {websiteAvailable ? number.format(item.value) : "—"}
                    </p>
                  </section>
                ))}
              </div>
              {websiteAvailable && (
                <>
                  <section
                    aria-labelledby="traffic-chart"
                    className="rounded-xl border border-[#d4d7da] bg-white p-4"
                  >
                    <h2 id="traffic-chart" className="font-semibold">
                      ผู้เข้าชมรายวัน
                    </h2>
                    <div className="mt-4 overflow-x-auto">
                      <div
                        className="flex h-36 items-end gap-1 border-b border-[#d4d7da]"
                        style={{ minWidth: Math.max(280, range.days * 10) }}
                      >
                        {report.rows.map((row) => (
                          <div
                            key={row.day}
                            title={`${thaiDate(row.day)}: ${row.visitors} ผู้เข้าชม`}
                            className="flex h-full flex-1 items-end"
                          >
                            <div
                              className="w-full rounded-t-sm bg-[#c4142e]"
                              style={{ height: `${(row.visitors / max) * 100}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-[#666b70]">
                      <span>{thaiDate(range.start)}</span>
                      <span>{thaiDate(range.end)}</span>
                    </div>
                    </section>
                  <ReportTable
                    title="ตารางรายวัน"
                    columns={["วันที่", "ผู้เข้าชมไม่ซ้ำ", "เปิดหน้า", "คลิกติดต่อ"]}
                  >
                    {[...report.rows].reverse().map((row) => {
                      const unavailable = !firstDay || row.day < firstDay || row.day > today;
                      return (
                        <tr key={row.day} className="border-t border-[#e5e7e9]">
                          <th scope="row" className="px-4 py-3 text-left font-normal">
                            {thaiDate(row.day)}
                            {unavailable && (
                              <span className="ml-2 text-xs text-[#74797e]">
                                {row.day > today ? "ยังไม่ถึงวัน" : "ยังไม่มีข้อมูล"}
                              </span>
                            )}
                          </th>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {unavailable ? "—" : number.format(row.visitors)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {unavailable ? "—" : number.format(row.views)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {unavailable ? "—" : number.format(row.contactClicks)}
                          </td>
                        </tr>
                      );
                    })}
                  </ReportTable>
                  <ReportTable
                    title="หน้าที่มีการเปิดมากที่สุด 10 อันดับ"
                    columns={["หน้าเว็บ", "เปิดหน้า"]}
                    empty={!report.pages.length}
                  >
                    {report.pages.map((page) => (
                      <tr key={page.path} className="border-t border-[#e5e7e9]">
                        <th scope="row" className="break-all px-4 py-3 text-left font-normal">
                          {page.path}
                        </th>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {number.format(page._count._all)}
                        </td>
                      </tr>
                    ))}
                  </ReportTable>
                </>
              )}
              {/* First-party collection starts after analytics consent; visitor cookies
                differ from Vercel identities. Sessions expire after 30 minutes.
                DNT/GPC and known bot filtering apply. Never add these users to
                Vercel/Google totals or sum daily distinct users across a period. */}
              {websiteAvailable && <TrafficBreakdown report={report} />}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
