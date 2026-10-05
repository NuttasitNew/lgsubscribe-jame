import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { getVercelTrafficReport } from "@/lib/analytics/vercel-report";
import type { dateRange } from "@/lib/analytics/date-range";
import { ReportTable } from "./report-table";
const number = new Intl.NumberFormat("th-TH");
const date = (day: string) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
export async function VercelTraffic({ range }: { range: ReturnType<typeof dateRange> }) {
  await requireBackofficeSession("analytics.view");
  let report;
  try {
    report = await getVercelTrafficReport(range);
  } catch {
    return (
      <p role="alert" className="rounded-xl border bg-white p-4 text-sm text-red-700">
        โหลดข้อมูล Vercel ไม่สำเร็จ กรุณาลองอีกครั้ง
      </p>
    );
  }
  if (!report.rows.length)
    return (
      <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        ยังไม่มีข้อมูล Vercel ในช่วงที่เลือก
      </p>
    );
  const max = Math.max(1, ...report.rows.map((row) => row.visitors));
  return (
    <>
      {/* Period visitors are supplied by a separate Vercel environment aggregate,
        never by adding daily uniques. Missing exact totals stay unavailable.
        All Vercel day boundaries are UTC, including selected calendar dates. */}
      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-xl border bg-white p-4 sm:p-5">
          <h2 className="text-sm text-slate-500">ผู้เข้าชมไม่ซ้ำ · Vercel</h2>
          <p
            className="mt-2 text-3xl font-semibold"
            title={report.visitors === null ? "ยังไม่มีรายงานยอดไม่ซ้ำสำหรับช่วงนี้" : undefined}
          >
            {report.visitors === null ? "—" : number.format(report.visitors)}
          </p>
        </section>
        <section className="rounded-xl border bg-white p-4 sm:p-5">
          <h2 className="text-sm text-slate-500">เปิดหน้า · Vercel</h2>
          <p className="mt-2 text-3xl font-semibold">{number.format(report.pageviews)}</p>
        </section>
      </div>
      <section className="rounded-xl border bg-white p-4" aria-labelledby="vercel-chart">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="vercel-chart" className="font-semibold">
            ผู้เข้าชมรายวัน · Vercel
          </h2>
          <span
            className="text-xs text-slate-500"
            title={
              report.asOf
                ? `นำเข้า ${new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(report.asOf)}`
                : undefined
            }
          >
            UTC
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div
            className="flex h-36 items-end gap-1 border-b"
            style={{ minWidth: Math.max(220, report.rows.length * 10) }}
          >
            {report.rows.map((row) => (
              <div
                key={row.day}
                title={`${date(row.day)}: ${row.visitors} ผู้เข้าชม`}
                className="flex h-full flex-1 items-end"
              >
                <div
                  className="w-full rounded-t-sm bg-primary"
                  style={{ height: `${(row.visitors / max) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{date(report.first!)}</span>
          <span>{date(report.last!)}</span>
        </div>
      </section>
      <ReportTable title="ตารางรายวัน · Vercel" columns={["วันที่ (UTC)", "ผู้เข้าชมไม่ซ้ำ", "เปิดหน้า"]}>
        {[...report.rows].reverse().map((row) => (
          <tr key={row.day} className="border-t">
            <th scope="row" className="px-4 py-3 text-left font-normal">
              {date(row.day)}
            </th>
            <td className="px-4 py-3 text-right tabular-nums">{number.format(row.visitors)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{number.format(row.pageviews)}</td>
          </tr>
        ))}
      </ReportTable>
    </>
  );
}
