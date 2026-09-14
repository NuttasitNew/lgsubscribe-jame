import Link from "next/link";
import { getPrisma } from "@/lib/db/prisma";
import { siteConfig } from "@/lib/site";
import { requireBackofficeAccess, isLocalPreview } from "@/feature/backoffice/auth/session";
import { logout } from "@/feature/backoffice/auth/actions";
import { googleConfigured } from "./google";
import { defaultPeriod, previousPeriod, sources } from "./validation";
import { ImportForm, KeywordForm, SeedForm, SyncForm, ToggleForm } from "./forms";

const date = (value: Date) => value.toISOString().slice(0, 10);
const number = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("th-TH", { maximumFractionDigits: 1 });
const sourceLabels: Record<string, string> = { GSC_API: "Google API", GSC_CSV: "CSV Search Console" };
export async function SeoDashboard({
  source,
  query,
  showPaused,
}: {
  source: string;
  query: string;
  showPaused: boolean;
}) {
  await requireBackofficeAccess();
  const selectedSource = sources.includes(source as (typeof sources)[number]) ? source : "GSC_API";
  let keywords, runs;
  try {
    [keywords, runs] = await Promise.all([
      getPrisma().seoKeyword.findMany({
        where: {
          ...(showPaused ? {} : { active: true }),
          ...(query ? { keyword: { contains: query, mode: "insensitive" } } : {}),
        },
        orderBy: [{ priority: "asc" }, { keyword: "asc" }],
        take: 200,
        include: {
          measurements: {
            where: { source: selectedSource },
            orderBy: [{ periodEnd: "desc" }, { measuredAt: "desc" }],
            take: 20,
          },
        },
      }),
      getPrisma().seoSyncRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
    ]);
  } catch {
    return (
      <main className="container-page py-12">
        <h1 className="text-2xl font-bold">ติดตาม SEO</h1>
        <p role="alert" className="mt-4">
          ยังอ่านฐานข้อมูลไม่ได้ กรุณาตรวจการเชื่อมต่อและ migration ก่อนใช้งาน
        </p>
        <Link href="/backoffice/" className="mt-4 inline-block underline">
          กลับภาพรวม
        </Link>
      </main>
    );
  }
  const { start, end } = defaultPeriod();
  const measured = keywords.filter((k) => k.measurements[0]?.status === "MEASURED");
  const achieved = measured.filter(
    (k) => k.measurements[0].position !== null && k.measurements[0].position! <= k.targetRank,
  );
  return (
    <div className="min-h-screen bg-[#eef0f2] text-slate-900">
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
        <nav className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/backoffice/" className="font-semibold">
            ← LG Backoffice
          </Link>
          <div className="flex gap-4">
            <a href="/backoffice/seo/export/" className="underline">
              ส่งออกประวัติ CSV
            </a>
            {!isLocalPreview() && (
              <form action={logout}>
                <button className="underline">ออกจากระบบ</button>
              </form>
            )}
          </div>
        </nav>
        <header className="rounded-3xl bg-[#1b1d20] p-6 text-white sm:p-9">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-white/30 px-3 py-1">
              {process.env.DATABASE_ENV === "production"
                ? "Production · ข้อมูลจริง"
                : "Development · ข้อมูลพัฒนา"}
            </span>
            <span className="text-white/65">{siteConfig.url}</span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold">ติดตาม SEO และคำค้นหา</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
            กำหนดคำที่ต้องการให้ติดอันดับ แล้วดูผลจาก Search Console แยกตามประเทศและอุปกรณ์
            อันดับเป็นค่าเฉลี่ยจาก Google ไม่ใช่อันดับตายตัวที่ผู้ค้นหาทุกคนเห็น
          </p>
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["คำที่แสดงในรายการ", keywords.length],
            ["มีผลวัดในแหล่งที่เลือก", measured.length],
            ["ถึงอันดับเป้าหมาย", achieved.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          นับจากผลล่าสุดของแต่ละคำตามตัวกรองด้านล่าง วันที่อาจต่างกัน ไม่ใช่ยอดรวมเว็บไซต์
        </p>
        <section className="mt-5 rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-semibold">คำค้นหาเป้าหมาย</h2>
          <form className="mt-4 flex flex-wrap gap-3">
            <input
              aria-label="ค้นหาคำที่ติดตาม"
              name="q"
              placeholder="ค้นหาคำที่ติดตาม"
              defaultValue={query}
              className="min-w-0 rounded-lg border px-3 py-2 text-sm"
            />
            <select
              aria-label="แหล่งผลวัด"
              name="source"
              defaultValue={selectedSource}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="GSC_API">Google API</option>
              <option value="GSC_CSV">CSV Search Console</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="paused" value="1" defaultChecked={showPaused} />
              รวมคำที่พักติดตาม
            </label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">แสดงผล</button>
          </form>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            “ยังไม่มีผลวัด” หรือ “Google ไม่ส่งข้อมูล” ไม่ได้แปลว่าไม่ถูกจัดทำดัชนี คำปริมาณน้อยอาจถูกซ่อน
            และไม่มีการแทนค่าที่ขาดด้วยอันดับ 0
          </p>
          {!keywords.length ? (
            <div className="py-10">
              <p className="mb-4 text-slate-500">
                ยังไม่มีคำในรายการนี้ เพิ่มคำเองหรือเริ่มด้วยชุดคำที่แนะนำ
              </p>
              <SeedForm />
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b text-xs text-slate-500">
                  <tr>
                    {[
                      "คำค้นหา / หน้าเป้าหมาย",
                      "กลุ่ม / อุปกรณ์",
                      "อันดับเฉลี่ย",
                      "คลิก / แสดงผล",
                      "CTR",
                      "ช่วงเวลา / ประวัติ",
                    ].map((h) => (
                      <th className="px-3 py-3 font-medium" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((k) => {
                    const latest = k.measurements[0];
                    const previousRange = latest
                      ? previousPeriod(latest.periodStart, latest.periodEnd)
                      : null;
                    const previous = previousRange
                      ? k.measurements.find(
                          (m) =>
                            m.status === "MEASURED" &&
                            m.periodStart.getTime() === previousRange.start.getTime() &&
                            m.periodEnd.getTime() === previousRange.end.getTime(),
                        )
                      : null;
                    const change =
                      latest?.position != null && previous?.position != null
                        ? previous.position - latest.position
                        : null;
                    return (
                      <tr className="border-b align-top last:border-0" key={k.id}>
                        <td className="max-w-[260px] px-3 py-4">
                          <p className="font-semibold">
                            {k.keyword} {!k.active && <span className="text-xs text-slate-400">พักอยู่</span>}
                          </p>
                          <a
                            href={`${siteConfig.url}${k.targetPath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block break-all text-xs text-slate-500 underline"
                          >
                            {k.targetPath}
                          </a>
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-primary">แก้ไขเป้าหมาย</summary>
                            <div className="mt-3 min-w-[240px]">
                              <KeywordForm keyword={k} />
                              <div className="mt-3">
                                <ToggleForm id={k.id} active={k.active} />
                              </div>
                            </div>
                          </details>
                        </td>
                        <td className="px-3 py-4">
                          <p>
                            {k.cluster} · {k.priority}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {k.country.toUpperCase()} · {k.device}
                          </p>
                          <p className="mt-1 text-xs">เป้าหมาย Top {k.targetRank}</p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-xl font-semibold">{number(latest?.position ?? null)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {!latest
                              ? "ยังไม่มีผลวัด"
                              : latest.status === "NO_DATA"
                                ? "Google ไม่ส่งข้อมูล"
                                : latest.position! <= k.targetRank
                                  ? "ถึงเป้าหมาย"
                                  : "ยังไม่ถึงเป้าหมาย"}
                          </p>
                          {change !== null && (
                            <p
                              className={`mt-2 text-xs ${change > 0 ? "text-emerald-700" : change < 0 ? "text-red-700" : "text-slate-500"}`}
                            >
                              {change > 0 ? "ดีขึ้น" : change < 0 ? "ลดลง" : "เท่าเดิม"}{" "}
                              {number(Math.abs(change))} อันดับเทียบช่วงก่อนหน้า
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          {number(latest?.clicks ?? null)} / {number(latest?.impressions ?? null)}
                        </td>
                        <td className="px-3 py-4">
                          {latest?.impressions
                            ? `${number((latest.clicks! / latest.impressions) * 100)}%`
                            : "—"}
                        </td>
                        <td className="max-w-xs px-3 py-4">
                          {latest ? (
                            <>
                              <p className="text-xs">
                                {date(latest.periodStart)} – {date(latest.periodEnd)}
                              </p>
                              {latest.observedPage && (
                                <a
                                  href={latest.observedPage}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 block break-all text-xs text-primary underline"
                                >
                                  หน้าที่มีคลิกสูงสุดในคำนี้
                                </a>
                              )}
                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs underline">
                                  ประวัติ {k.measurements.length} ช่วงล่าสุด
                                </summary>
                                <ul className="mt-2 space-y-2 text-xs">
                                  {k.measurements.map((m) => (
                                    <li key={m.id}>
                                      {date(m.periodStart)} – {date(m.periodEnd)}
                                      <br />
                                      อันดับ {number(m.position)} · {number(m.clicks)} คลิก
                                      <br />
                                      <span className="text-slate-500">บันทึก {date(m.measuredAt)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">รอนำเข้าหรือซิงก์</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">เพิ่มคำค้นหา</h2>
            <KeywordForm />
            <details className="mt-5 border-t pt-4">
              <summary className="cursor-pointer text-sm">ชุดคำแนะนำเริ่มต้น</summary>
              <p className="my-3 text-xs leading-5 text-slate-500">
                เลือกตามบริการที่ขาย ยังไม่ใช่คำที่ยืนยันปริมาณค้นหาแล้ว เพิ่มซ้ำได้โดยไม่สร้างคำซ้ำ
              </p>
              <SeedForm />
            </details>
          </section>
          <div className="space-y-5">
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="text-lg font-semibold">เชื่อม Search Console</h2>
              <p
                className={`mb-4 mt-2 text-sm ${googleConfigured() ? "text-emerald-700" : "text-amber-700"}`}
              >
                {googleConfigured()
                  ? "มีค่าการเชื่อมต่อแล้ว · กดดึงข้อมูลเพื่อตรวจสิทธิ์"
                  : "รอเชื่อมบัญชี Google · นำเข้า CSV ได้ระหว่างนี้"}
              </p>
              <SyncForm start={start} end={end} configured={googleConfigured()} />
              <p className="mt-3 text-xs text-slate-500">
                การอัปเดตตามเวลาจะเริ่มได้หลังเชื่อมบัญชี Google และเปิดใช้งานบนเว็บไซต์จริง
              </p>
            </section>
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">นำเข้าผลจาก CSV</h2>
              <ImportForm start={start} end={end} />
            </section>
          </div>
        </div>
        <section className="mt-5 rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-semibold">การนำเข้าและซิงก์ล่าสุด</h2>
          {runs.length ? (
            <ul className="mt-3 divide-y">
              {runs.map((run) => (
                <li key={run.id} className="py-3 text-sm">
                  <p>
                    {sourceLabels[run.source] ?? run.source} ·{" "}
                    {run.status === "SUCCESS"
                      ? "สำเร็จ"
                      : run.status === "FAILED"
                        ? "ไม่สำเร็จ"
                        : "เริ่มซิงก์แล้ว (หากค้างนานให้ลองใหม่)"}{" "}
                    · {run.processed} คำ
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {date(run.periodStart)} – {date(run.periodEnd)} · เริ่ม{" "}
                    {run.startedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                  </p>
                  {run.message && <p className="mt-1 text-xs">{run.message}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">ยังไม่มีการนำเข้าหรือซิงก์</p>
          )}
        </section>
      </main>
    </div>
  );
}
