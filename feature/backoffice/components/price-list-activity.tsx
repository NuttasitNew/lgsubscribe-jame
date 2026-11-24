import { finalItems, roundGap, splitRounds } from "@/lib/price-list-activity";

type Activity = { id: string; code: string; session: string; kind: string; detail: unknown; createdAt: Date };
type Detail = Record<string, unknown>;

const time = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", { timeStyle: "medium", timeZone: "Asia/Bangkok" }).format(value);
const dateTime = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(value);
const baht = (value: unknown) => (typeof value === "number" ? `฿${value.toLocaleString("th-TH")}` : "");
const customerName = (value: unknown) =>
  value === "new" ? "ลูกค้าใหม่" : value === "existing" ? "ลูกค้าเดิม" : "-";
const item = (d: Detail) => [d.model, d.contract, baht(d.regularPrice)].filter(Boolean).join(" · ");
const items = (value: unknown) =>
  Array.isArray(value) ? value.map((i: Detail) => `${i.model} (${i.contract}) × ${i.units}`).join(", ") : "";

/** One line of Thai for each logged action. */
export function describeActivity(kind: string, raw: unknown): string {
  const d = (raw && typeof raw === "object" ? raw : {}) as Detail;
  switch (kind) {
    case "customer":
      return `เลือก${customerName(d.customer)}${d.previous ? ` (เดิม ${customerName(d.previous)})` : ""}`;
    case "model":
      return `เปิดสินค้า ${d.model ?? ""}${d.category ? ` · ${d.category}` : ""}`;
    case "add":
      return `เพิ่ม ${item(d)}`;
    case "remove":
      return `ลด ${item(d)}`;
    case "contract":
      return `เปลี่ยนสัญญา ${d.model ?? ""}: ${d.from ?? "-"} → ${d.contract ?? "-"} (${d.units ?? 1} เครื่อง)`;
    case "cart":
      return `ดูยอดรวม ${d.units ?? 0} เครื่อง: ${items(d.items)}`;
    case "schedule":
      return `เปิดตารางผ่อน ${item(d)}`;
    case "promo":
      return `โปรรายรุ่น ${d.item ? "เปิด" : "ปิด"} · คอมโบ ${d.combo ? "เปิด" : "ปิด"}`;
    case "clear":
      return `ล้างรายการ ${d.units ?? 0} เครื่อง (ก่อนล้าง: ${items(d.items) || "-"})`;
    case "reset":
      return `ล้างทั้งหมด จบรอบ${d.customer ? ` ${customerName(d.customer)}` : ""} (${d.units ?? 0} เครื่อง${items(d.items) ? `: ${items(d.items)}` : ""})`;
    default:
      return kind;
  }
}

/** Latest customer rounds, newest first, each replayed step by step. */
export function PriceListActivity({ events }: { events: Activity[] }) {
  const sessions = splitRounds(events).slice(0, 20);

  return (
    <section className="overflow-hidden rounded-xl border border-[#d4d7da] bg-white">
      <div className="border-b border-[#d4d7da] px-4 py-3">
        <h2 className="font-semibold">กิจกรรมแต่ละรอบ (ล่าสุด 20 รอบ)</h2>
        <p className="text-xs text-[#666b70]">
          ขึ้นรอบใหม่เมื่อพนักงานกด &quot;ล้างทั้งหมด&quot; หรือเว้นช่วงเกิน {roundGap / 60000} นาที
        </p>
      </div>
      {sessions.length === 0 ? (
        <p className="p-4 text-sm text-[#666b70]">ยังไม่มีกิจกรรม</p>
      ) : (
        <ul className="divide-y divide-[#e5e7e9]">
          {sessions.map((list) => {
            const first = list[0];
            const last = list.at(-1)!;
            const customer = list.findLast((e) => e.kind === "customer")?.detail as Detail | undefined;
            const adds = list.filter((e) => e.kind === "add").length;
            const order = finalItems(list);
            const ended = last.kind === "reset";
            return (
              <li key={first.id}>
                <details className="group">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-[#f5f6f7]">
                    <b className="font-semibold">{first.code}</b>
                    <span className="tabular-nums text-[#666b70]">
                      {dateTime(first.createdAt)} – {time(last.createdAt)}
                    </span>
                    <span>{customerName(customer?.customer)}</span>
                    <span className="text-[#666b70]">
                      {list.length} ขั้น · เพิ่มสินค้า {adds} ครั้ง
                    </span>
                    {ended && (
                      <span className="rounded-full bg-[#eef0f2] px-2 py-0.5 text-xs text-[#666b70]">
                        กดล้างทั้งหมด
                      </span>
                    )}
                    <span className="ml-auto text-xs text-primary group-open:hidden">ดูทีละขั้น</span>
                    <span className="basis-full text-[#3d4247]">
                      {order.length
                        ? `รายการสุดท้าย: ${order.map((o) => `${o.model} (${o.contract}) × ${o.units}`).join(", ")}`
                        : "รายการสุดท้าย: ไม่มีสินค้า"}
                    </span>
                  </summary>
                  <ol className="space-y-1.5 border-t border-[#e5e7e9] bg-[#fafafa] px-4 py-3 text-sm">
                    {list.map((e) => (
                      <li key={e.id} className="flex gap-3">
                        <span className="w-20 shrink-0 tabular-nums text-[#666b70]">{time(e.createdAt)}</span>
                        <span className="min-w-0 break-words">{describeActivity(e.kind, e.detail)}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
