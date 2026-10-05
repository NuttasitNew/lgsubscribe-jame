import { Button } from "@/components/ui/button";
import { getPrisma } from "@/lib/db/prisma";
import { bangkokToday, type dateRange } from "@/lib/analytics/date-range";
import type { GoogleMetric } from "@/lib/analytics/google-sync";
import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { ReportTable } from "./report-table";

const cell = "border-t border-[#e5e7e9] px-4 py-3 text-right tabular-nums";
const time = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  dateStyle: "medium",
  timeStyle: "short",
});
const money = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export async function GoogleReports({ range }: { range: ReturnType<typeof dateRange> }) {
  await requireBackofficeSession();
  let snapshots;
  let latest;
  try {
    const prisma = getPrisma();
    const accounts = [
      { provider: "google_ads", externalId: process.env.GOOGLE_ADS_CUSTOMER_ID ?? "unset" },
      { provider: "ga4", externalId: process.env.GA4_PROPERTY_ID ?? "unset" },
    ];
    [snapshots, latest] = await Promise.all([
      prisma.googleDailySnapshot.findMany({
        where: {
          OR: accounts,
          day: { gte: new Date(`${range.start}T00:00:00Z`), lte: new Date(`${range.end}T00:00:00Z`) },
        },
        orderBy: { day: "desc" },
      }),
      prisma.googleDailySnapshot.groupBy({
        by: ["provider"],
        where: { OR: accounts },
        _max: { syncedAt: true },
      }),
    ]);
  } catch {
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
        ยังโหลดรายงาน Google ไม่ได้ กรุณาตรวจการเชื่อมต่อฐานข้อมูลและ migration
      </p>
    );
  }
  const ads = snapshots
    .filter((row) => row.provider === "google_ads")
    .map((snapshot) => {
      const rows = snapshot.rows as unknown as GoogleMetric[];
      return {
        day: snapshot.day.toISOString().slice(0, 10),
        impressions: rows.reduce((s, r) => s + (r.impressions ?? 0), 0),
        clicks: rows.reduce((s, r) => s + (r.clicks ?? 0), 0),
        cost: rows.reduce((s, r) => s + (r.costMicros ?? 0), 0) / 1000000,
        conversions: rows.reduce((s, r) => s + (r.conversions ?? 0), 0),
        allConversions: rows.reduce((s, r) => s + (r.allConversions ?? 0), 0),
      };
    });
  const ga = snapshots
    .filter((row) => row.provider === "ga4")
    .map((snapshot) => ({
      day: snapshot.day.toISOString().slice(0, 10),
      total: (snapshot.rows as unknown as GoogleMetric[]).find((row) => row.segment === "__total__")!,
    }));
  const channels = new Map<string, { sessions: number; views: number; contacts: number }>();
  for (const snapshot of snapshots.filter((row) => row.provider === "ga4"))
    for (const row of snapshot.rows as unknown as GoogleMetric[]) {
      if (row.segment === "__total__") continue;
      const value = channels.get(row.label) ?? { sessions: 0, views: 0, contacts: 0 };
      value.sessions += row.sessions ?? 0;
      value.views += row.views ?? 0;
      value.contacts += row.contactClicks ?? 0;
      channels.set(row.label, value);
    }
  const configured = Boolean(
    process.env.GOOGLE_REPORT_SYNC_SECRET &&
    process.env.GOOGLE_ADS_CUSTOMER_ID &&
    process.env.GA4_PROPERTY_ID,
  );
  const yesterday = new Date(Date.parse(`${bangkokToday()}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const historyEnd = range.end < yesterday ? range.end : yesterday;
  const historyParams = new URLSearchParams({ start: range.start, end: historyEnd }).toString();
  return (
    <>
      <section id="google-history" className="scroll-mt-24 rounded-xl border border-[#d4d7da] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Google Ads และ Google Analytics 4</h2>
          {configured && (
            <Button asChild size="sm" variant="outline">
              <a href="/api/backoffice/google-script/" download>
                เชื่อม Google Ads
              </a>
            </Button>
          )}
          {configured && (
            <Button asChild size="sm" variant="outline">
              <a href="/api/backoffice/google-script/?source=ga4" download>
                เชื่อม GA4
              </a>
            </Button>
          )}
        </div>
        <div className="mt-3 grid gap-2 text-sm text-[#666b70] sm:grid-cols-2">
          {["google_ads", "ga4"].map((provider) => {
            const synced = latest.find((row) => row.provider === provider)?._max.syncedAt;
            return (
              <p key={provider}>
                {provider === "google_ads"
                  ? `Google Ads · ${process.env.GOOGLE_ADS_CUSTOMER_ID ?? "ยังไม่ตั้งค่า"}`
                  : `GA4 · ${process.env.GA4_PROPERTY_ID ?? "ยังไม่ตั้งค่า"}`}
                <span className="mt-1 block text-xs">
                  {synced ? `รับข้อมูลล่าสุด ${time.format(synced)}` : "รอเชื่อมต่อเพื่อรับรายงานจริง"}
                </span>
              </p>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-6 text-[#666b70]">
          รายงาน Google แสดงแยกจากยอดเว็บไซต์เพื่อไม่ให้นับซ้ำ Google Ads แบ่ง Conversions (Primary) และ All
          conversions (รวม Secondary) ข้อมูลรายงานอาจมาช้าและถูกปรับย้อนหลัง
        </p>
        {configured && (
          <details className="mt-3 border-t border-[#e5e7e9] pt-3">
            <summary className="cursor-pointer text-sm font-medium text-[#1d1f22]">
              นำเข้าข้อมูลย้อนหลังจาก Google
            </summary>
            <p className="mt-2 text-xs leading-6 text-[#666b70]">
              ดึงได้เฉพาะข้อมูลที่ Google บันทึกไว้ ใช้ช่วงวันที่เลือกด้านบน
              และนำเข้าจนถึงวันก่อนหน้าเพื่อให้ข้อมูลครบวัน สถิติของเว็บไซต์เริ่มเก็บเมื่อเปิดระบบนี้
            </p>
            {range.start <= historyEnd ? (
              <>
                <p className="mt-2 text-xs text-[#666b70]">
                  ช่วงย้อนหลัง: {range.start} – {historyEnd}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/backoffice/google-script/?source=google_ads&${historyParams}`} download>
                      สคริปต์ย้อนหลัง Ads
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/backoffice/google-script/?source=ga4&${historyParams}`} download>
                      สคริปต์ย้อนหลัง GA4
                    </a>
                  </Button>
                </div>
                <p className="mt-2 text-xs leading-6 text-[#666b70]">
                  หลังเชื่อมบัญชีและเปิดปลายทางรับข้อมูลแล้ว รันสคริปต์ย้อนหลังครั้งเดียว
                  ข้อมูลจะเก็บในฐานข้อมูลและอัปเดตวันเดิมโดยไม่บวกซ้ำ
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-[#666b70]">เลือกช่วงก่อนวันนี้เพื่อนำเข้าข้อมูลย้อนหลัง</p>
            )}
          </details>
        )}
        {snapshots.some((row) => row.quality !== "reported") && (
          <p className="mt-2 text-xs text-amber-800">
            บางวัน Google ระบุข้อมูลมี threshold, sampling หรือแถวรวม (other) ตัวเลขเป็นผลที่ Google รายงาน
          </p>
        )}
      </section>
      <ReportTable
        title="Google Ads · รายวัน"
        columns={["วันที่", "Impressions", "คลิกโฆษณา", "ค่าใช้จ่าย (บาท)", "Conversions", "All conversions"]}
        empty={!ads.length}
      >
        {ads.map((row) => (
          <tr key={row.day}>
            <th
              scope="row"
              className="border-t border-[#e5e7e9] px-4 py-3 text-left font-normal whitespace-nowrap"
            >
              {row.day}
            </th>
            <td className={cell}>{row.impressions}</td>
            <td className={cell}>{row.clicks}</td>
            <td className={cell}>{money.format(row.cost)}</td>
            <td className={cell}>{money.format(row.conversions)}</td>
            <td className={cell}>{money.format(row.allConversions)}</td>
          </tr>
        ))}
      </ReportTable>
      <ReportTable
        title="GA4 · รายวัน"
        columns={["วันที่", "Active users", "Sessions", "เปิดหน้า", "คลิกติดต่อ"]}
        empty={!ga.length}
      >
        {ga.map((row) => (
          <tr key={row.day}>
            <th
              scope="row"
              className="border-t border-[#e5e7e9] px-4 py-3 text-left font-normal whitespace-nowrap"
            >
              {row.day}
            </th>
            <td className={cell}>{row.total.visitors}</td>
            <td className={cell}>{row.total.sessions}</td>
            <td className={cell}>{row.total.views}</td>
            <td className={cell}>{row.total.contactClicks}</td>
          </tr>
        ))}
      </ReportTable>
      <ReportTable
        title="GA4 · แหล่งที่มา / Medium"
        columns={["แหล่งที่มา", "Sessions", "เปิดหน้า", "คลิกติดต่อ"]}
        empty={!channels.size}
      >
        {[...channels]
          .sort((a, b) => b[1].sessions - a[1].sessions)
          .map(([label, row]) => (
            <tr key={label}>
              <th scope="row" className="border-t border-[#e5e7e9] break-all px-4 py-3 text-left font-normal">
                {label}
              </th>
              <td className={cell}>{row.sessions}</td>
              <td className={cell}>{row.views}</td>
              <td className={cell}>{row.contacts}</td>
            </tr>
          ))}
      </ReportTable>
      <p className="text-xs leading-6 text-[#666b70]">
        Active users ของ GA4 มีนิยามต่างจากผู้เข้าชมเว็บไซต์และบวกรายวันเพื่อหาผู้ใช้ไม่ซ้ำทั้งช่วงไม่ได้
        ตารางแสดงเฉพาะวันที่รับรายงานสำเร็จ วันที่ไม่มี snapshot ยังไม่ได้รับข้อมูล
        คลิกโฆษณาและคลิกติดต่อยังไม่ใช่ยอดขาย
      </p>
    </>
  );
}
