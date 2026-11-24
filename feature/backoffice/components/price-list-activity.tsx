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
    default:
      return kind;
  }
}

/** Latest visits, newest first, each replayed step by step. */
export function PriceListActivity({ events }: { events: Activity[] }) {
  const sessions = [...Map.groupBy(events, (e) => e.session).values()]
    .map((list) => list.toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime()))
    .sort((a, b) => b.at(-1)!.createdAt.getTime() - a.at(-1)!.createdAt.getTime())
    .slice(0, 20);

  return (
    <section className="overflow-hidden rounded-xl border border-[#d4d7da] bg-white">
      <h2 className="border-b border-[#d4d7da] px-4 py-3 font-semibold">กิจกรรมแต่ละรอบ (ล่าสุด 20 รอบ)</h2>
      {sessions.length === 0 ? (
        <p className="p-4 text-sm text-[#666b70]">ยังไม่มีกิจกรรม</p>
      ) : (
        <ul className="divide-y divide-[#e5e7e9]">
          {sessions.map((list) => {
            const first = list[0];
            const last = list.at(-1)!;
            const customer = list.findLast((e) => e.kind === "customer")?.detail as Detail | undefined;
            const adds = list.filter((e) => e.kind === "add").length;
            return (
              <li key={first.session}>
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
                    <span className="ml-auto text-xs text-primary group-open:hidden">ดูทีละขั้น</span>
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
