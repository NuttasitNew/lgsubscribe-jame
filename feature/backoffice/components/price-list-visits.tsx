import { Eye, Globe, LogIn, MapPin, Monitor, Smartphone, Tablet, UserRound } from "lucide-react";
import { describeDevice } from "@/lib/price-list-access";

export type Visit = {
  id: string;
  kind: string;
  createdAt: Date;
  userAgent: string | null;
  deviceId: string | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  device: unknown;
  email: string | null;
  googleName: string | null;
};
type Device = { screen?: string; lang?: string; tz?: string; model?: string };

const tones = [
  "bg-sky-50 text-sky-700 ring-sky-200",
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "bg-amber-50 text-amber-700 ring-amber-200",
  "bg-rose-50 text-rose-700 ring-rose-200",
  "bg-teal-50 text-teal-700 ring-teal-200",
];
const unknownTone = "bg-[#f1f2f4] text-[#666b70] ring-[#e1e3e6]";
const day = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" }).format(value);
const clock = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(value);
const when = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(value);
const details = (raw: unknown): Device => (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
const who = (v: Visit) => (v.googleName ? `${v.googleName} (${v.email})` : v.email);
const place = (v: Visit) => [v.city, v.region, v.country].filter(Boolean).join(", ");

function KindIcon({ userAgent }: { userAgent: string | null }) {
  const ua = userAgent ?? "";
  const Icon =
    /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
      ? Tablet
      : /iPhone|Android/i.test(ua)
        ? Smartphone
        : Monitor;
  return <Icon className="size-4" aria-hidden />;
}

/** Devices behind one code, numbered by first sign-in (#1 = oldest), from the random id each browser keeps. */
export function numberDevices(visits: Visit[]) {
  const order = new Map<string, number>();
  for (const v of [...visits].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (v.deviceId && !order.has(v.deviceId)) order.set(v.deviceId, order.size + 1);
  }
  return order;
}

/** One code's sign-ins and page opens: a card per device, then every visit grouped by day. */
export function VisitList({ visits }: { visits: Visit[] }) {
  if (visits.length === 0)
    return <p className="p-6 text-center text-sm text-[#666b70]">ยังไม่มีการเข้าใช้</p>;
  const numbers = numberDevices(visits);
  const devices = [...numbers.entries()].map(([id, n]) => {
    const list = visits.filter((v) => v.deviceId === id);
    const latest = list[0];
    const withDetails = list.find((v) => v.device) ?? latest;
    const accounts = [...new Set(list.map(who).filter(Boolean))];
    return {
      id,
      n,
      latest,
      accounts,
      info: details(withDetails.device),
      count: list.length,
      logins: list.filter((v) => v.kind === "login").length,
    };
  });
  const days = new Map<string, Visit[]>();
  for (const v of visits) {
    const key = day(v.createdAt);
    days.set(key, [...(days.get(key) ?? []), v]);
  }
  return (
    <div className="space-y-4 p-3 sm:p-4">
      {devices.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium text-[#666b70]">
            เครื่องที่ใช้รหัสนี้ ({devices.length} เครื่อง)
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {devices.map((d) => (
              <div key={d.id} className="rounded-xl border border-[#e1e3e6] bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[(d.n - 1) % tones.length]}`}
                  >
                    เครื่อง #{d.n}
                  </span>
                  <span className="text-[#666b70]">
                    <KindIcon userAgent={d.latest.userAgent} />
                  </span>
                  <span className="ml-auto text-xs text-[#666b70]">
                    ใส่รหัส {d.logins} · ทั้งหมด {d.count} ครั้ง
                  </span>
                </div>
                {d.accounts.map((a) => (
                  <p key={a} className="mt-2 flex items-center gap-1.5 truncate text-sm font-semibold">
                    <UserRound className="size-3.5 shrink-0 text-primary" aria-hidden />
                    {a}
                  </p>
                ))}
                <p className="mt-2 text-sm font-medium">{describeDevice(d.latest.userAgent, d.info.model)}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#666b70]">
                  {d.info.screen && <span>จอ {d.info.screen}</span>}
                  {d.info.lang && <span>ภาษา {d.info.lang}</span>}
                  {d.info.tz && <span>{d.info.tz}</span>}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#666b70]">
                  {place(d.latest) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      {place(d.latest)}
                    </span>
                  )}
                  {d.latest.ip && (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="size-3" aria-hidden />
                      {d.latest.ip}
                    </span>
                  )}
                  <span>ล่าสุด {when(d.latest.createdAt)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {[...days.entries()].map(([label, list]) => (
        <section key={label}>
          <h3 className="sticky top-0 z-10 -mx-3 bg-white/95 px-3 py-1.5 text-xs font-medium text-[#666b70] backdrop-blur sm:-mx-4 sm:px-4">
            {label} · {list.length} ครั้ง
          </h3>
          <ul className="overflow-hidden rounded-xl border border-[#e1e3e6] bg-white">
            {list.map((v) => {
              const n = v.deviceId ? numbers.get(v.deviceId) : undefined;
              const login = v.kind === "login";
              return (
                <li
                  key={v.id}
                  className="flex items-center gap-3 border-t border-[#eef0f2] px-3 py-2.5 first:border-t-0"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-inset ${
                      login
                        ? "bg-primary/10 text-primary ring-primary/20"
                        : "bg-[#f8f9fa] text-[#9aa0a6] ring-[#e1e3e6]"
                    }`}
                  >
                    {login ? (
                      <LogIn className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="tabular-nums font-medium">{clock(v.createdAt)}</span>
                      <span className={login ? "font-semibold" : "text-[#666b70]"}>
                        {login ? "ใส่รหัส (login)" : "เปิดหน้า"}
                      </span>
                      {who(v) && <span className="truncate text-primary">{who(v)}</span>}
                    </div>
                    <p className="truncate text-xs text-[#666b70]">
                      {describeDevice(v.userAgent, details(v.device).model)}
                      {place(v) ? ` · ${place(v)}` : ""}
                      {v.ip ? ` · ${v.ip}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      n ? tones[(n - 1) % tones.length] : unknownTone
                    }`}
                  >
                    {n ? `เครื่อง #${n}` : "ไม่ทราบเครื่อง"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
