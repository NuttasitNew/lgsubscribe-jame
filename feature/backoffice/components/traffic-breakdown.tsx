import type { getTrafficReport } from "@/lib/analytics/report";
import { ReportTable } from "./report-table";

const cell = "border-t border-[#e5e7e9] px-4 py-3 text-right tabular-nums";
const names: Record<string, string> = {
  utm: "UTM",
  click_id: "Google click ID",
  referrer: "เว็บที่ส่งมา",
  direct: "ไม่มีข้อมูลแหล่งที่มา",
  unknown: "ข้อมูลเดิม",
};
export function TrafficBreakdown({ report }: { report: Awaited<ReturnType<typeof getTrafficReport>> }) {
  return (
    <>
      <ReportTable
        title="แหล่งที่มาของผู้เข้าชม · ข้อมูลเว็บไซต์"
        columns={["แหล่งที่มา / Medium", "ผู้เข้าชม", "เปิดหน้า", "คลิกติดต่อ"]}
        empty={!report.sources.length}
      >
        {report.sources.map((row) => (
          <tr key={`${row.source}:${row.medium}:${row.attributionMethod}`}>
            <th scope="row" className="border-t border-[#e5e7e9] px-4 py-3 text-left font-normal">
              <span className="break-all">
                {row.source} / {row.medium}
              </span>
              <span className="mt-1 block text-xs text-[#666b70]">
                {names[row.attributionMethod] ?? row.attributionMethod}
              </span>
            </th>
            <td className={cell}>{row.visitors}</td>
            <td className={cell}>{row.views}</td>
            <td className={cell}>{row.contactClicks}</td>
          </tr>
        ))}
      </ReportTable>
      <ReportTable
        title="แคมเปญที่พาคนเข้าเว็บไซต์ · UTM"
        columns={["แคมเปญ", "เปิดหน้า", "คลิกติดต่อ"]}
        empty={!report.campaigns.length}
      >
        {report.campaigns.map((row) => (
          <tr key={row.campaign}>
            <th scope="row" className="border-t border-[#e5e7e9] break-all px-4 py-3 text-left font-normal">
              {row.campaign}
            </th>
            <td className={cell}>{row.views}</td>
            <td className={cell}>{row.contactClicks}</td>
          </tr>
        ))}
      </ReportTable>
      <ReportTable
        title="อุปกรณ์ที่ใช้เข้าเว็บไซต์"
        columns={["อุปกรณ์", "เปิดหน้า"]}
        empty={!report.devices.length}
      >
        {report.devices.map((row) => (
          <tr key={row.device}>
            <th scope="row" className="border-t border-[#e5e7e9] px-4 py-3 text-left font-normal">
              {row.device === "mobile"
                ? "มือถือ"
                : row.device === "tablet"
                  ? "แท็บเล็ต"
                  : row.device === "desktop"
                    ? "คอมพิวเตอร์"
                    : "ข้อมูลเดิม"}
            </th>
            <td className={cell}>{row._count._all}</td>
          </tr>
        ))}
      </ReportTable>
      <p className="text-xs leading-6 text-[#666b70]">
        แหล่งที่มาจาก UTM, Google click ID และ referrer เป็นสัญญาณที่ตรวจพบในเว็บไซต์ Direct
        อาจรวมผู้เข้าชมที่ไม่มี referrer ผู้ใช้คนเดียวอาจอยู่หลายแหล่งที่มา คลิกติดต่อยังไม่ยืนยันการสนทนา
        การสมัคร หรือยอดขาย
      </p>
    </>
  );
}
