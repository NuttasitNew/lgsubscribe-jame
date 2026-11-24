import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { getPrisma } from "@/lib/db/prisma";
import { ReportTable } from "@/feature/backoffice/components/report-table";
import { PriceListCodes } from "@/feature/backoffice/components/price-list-codes";
import { priceListHosts } from "@/lib/price-list-host";
import { PriceListActivity } from "@/feature/backoffice/components/price-list-activity";

export const metadata = { title: "รหัสหน้าราคาพนักงาน" };
const number = new Intl.NumberFormat("th-TH");
const first = "px-4 py-3 text-left font-medium";
const cell = "px-4 py-3 text-right tabular-nums whitespace-nowrap";
const dateTime = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(value);

export default async function PriceListAccessPage() {
  await requireBackofficeSession("pricelist.manage");
  const prisma = getPrisma();
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);
  const [codes, totals, last7, last30, recent, activity] = await Promise.all([
    prisma.priceListAccessCode.findMany({ orderBy: { code: "asc" } }),
    prisma.priceListAccessLog.groupBy({
      by: ["code", "kind"],
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.priceListAccessLog.groupBy({
      by: ["code"],
      where: { createdAt: { gte: since7 } },
      _count: { _all: true },
    }),
    prisma.priceListAccessLog.groupBy({
      by: ["code"],
      where: { createdAt: { gte: since30 } },
      _count: { _all: true },
    }),
    prisma.priceListAccessLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    // Enough recent steps to replay the latest visits.
    prisma.priceListActivity.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
  ]);
  const count = (code: string, kind: string) =>
    totals.find((t) => t.code === code && t.kind === kind)?._count._all ?? 0;
  const lastUsed = (code: string) =>
    totals
      .filter((t) => t.code === code)
      .map((t) => t._max.createdAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const rows = codes
    .map((c) => ({
      ...c,
      logins: count(c.code, "login"),
      views: count(c.code, "view"),
      week: last7.find((t) => t.code === c.code)?._count._all ?? 0,
      month: last30.find((t) => t.code === c.code)?._count._all ?? 0,
      lastUsed: lastUsed(c.code),
    }))
    .sort((a, b) => (b.lastUsed?.getTime() ?? 0) - (a.lastUsed?.getTime() ?? 0));

  // The price list lives on its own hostname (PRICE_LIST_HOSTS); fall back to the path in local dev.
  const host = priceListHosts()[0];
  const pageUrl = host ? `https://${host}/` : "/price-list/";

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold">รหัสหน้าราคาพนักงาน</h1>
        <p className="mt-2 text-sm text-slate-500">
          พนักงานใส่รหัสใดก็ได้ที่เปิดใช้อยู่เพื่อเข้าหน้า{" "}
          <a href={pageUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
            {host ?? "/price-list/"}
          </a>{" "}
          (จำไว้ 7 วันต่อเครื่อง) · ทุกครั้งที่ใส่รหัสและเปิดหน้าจะถูกบันทึกไว้ด้านล่าง
        </p>
      </header>

      <ReportTable
        title="สถิติการใช้งานแต่ละรหัส"
        columns={["รหัส", "ใส่รหัส", "เปิดหน้า", "7 วัน", "30 วัน", "ใช้ล่าสุด"]}
        empty={rows.length === 0}
      >
        {rows.map((r) => (
          <tr key={r.code} className="border-t border-[#e5e7e9]">
            <td className={first}>
              {r.code}
              {r.label ? ` · ${r.label}` : ""}
              {r.isActive ? "" : " (ปิดอยู่)"}
            </td>
            <td className={cell}>{number.format(r.logins)}</td>
            <td className={cell}>{number.format(r.views)}</td>
            <td className={cell}>{number.format(r.week)}</td>
            <td className={cell}>{number.format(r.month)}</td>
            <td className={`${cell} ${r.lastUsed ? "" : "text-slate-400"}`}>
              {r.lastUsed ? dateTime(r.lastUsed) : "ยังไม่เคยใช้"}
            </td>
          </tr>
        ))}
      </ReportTable>

      <PriceListActivity events={activity} />

      <PriceListCodes codes={codes.map(({ code, label, isActive }) => ({ code, label, isActive }))} />

      <ReportTable
        title="ล่าสุด 50 ครั้ง"
        columns={["เวลา", "รหัส", "การใช้", "อุปกรณ์"]}
        empty={recent.length === 0}
      >
        {recent.map((e) => (
          <tr key={e.id} className="border-t border-[#e5e7e9]">
            <td className={`${first} tabular-nums`}>{dateTime(e.createdAt)}</td>
            <td className={cell}>{e.code}</td>
            <td className={cell}>{e.kind === "login" ? "ใส่รหัส" : "เปิดหน้า"}</td>
            <td className={cell}>{deviceOf(e.userAgent)}</td>
          </tr>
        ))}
      </ReportTable>
    </main>
  );
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function deviceOf(userAgent: string | null) {
  if (!userAgent) return "-";
  if (/iPad|Tablet/i.test(userAgent)) return "แท็บเล็ต";
  if (/iPhone|Android.*Mobile/i.test(userAgent)) return "มือถือ";
  if (/Android/i.test(userAgent)) return "แท็บเล็ต";
  return "คอมพิวเตอร์";
}
