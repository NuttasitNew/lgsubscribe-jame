import {
  CalendarDays,
  ChevronDown,
  Clock,
  Eye,
  Minus,
  Plus,
  Repeat,
  RotateCcw,
  ShoppingCart,
  Tag,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { finalItems, roundGap, splitRounds } from "@/lib/price-list-activity";

type Activity = { id: string; code: string; session: string; kind: string; detail: unknown; createdAt: Date };
type Detail = Record<string, unknown>;

const time = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", { timeStyle: "medium", timeZone: "Asia/Bangkok" }).format(value);
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

/** Latest customer rounds (all codes), newest first, each replayed step by step. */
export function PriceListActivity({ events }: { events: Activity[] }) {
  const rounds = splitRounds(events).slice(0, 20);
  return (
    <section className="overflow-hidden rounded-xl border border-[#d4d7da] bg-white">
      <div className="border-b border-[#d4d7da] px-4 py-3">
        <h2 className="font-semibold">กิจกรรมแต่ละรอบ (ล่าสุด 20 รอบ)</h2>
        <p className="text-xs text-[#666b70]">
          ขึ้นรอบใหม่เมื่อพนักงานกด &quot;ล้างทั้งหมด&quot; หรือเว้นช่วงเกิน {roundGap / 60000} นาที ·
          ดูเฉพาะรหัสได้จากปุ่ม &quot;ดูรายละเอียด&quot; ในตารางด้านบน
        </p>
      </div>
      <RoundList rounds={rounds} />
    </section>
  );
}

const kindIcon: Record<string, LucideIcon> = {
  customer: UserRound,
  model: Eye,
  add: Plus,
  remove: Minus,
  contract: Repeat,
  cart: ShoppingCart,
  schedule: CalendarDays,
  promo: Tag,
  clear: Trash2,
  reset: RotateCcw,
};
const kindTone: Record<string, string> = {
  add: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  remove: "bg-amber-50 text-amber-700 ring-amber-200",
  clear: "bg-rose-50 text-rose-700 ring-rose-200",
  reset: "bg-rose-50 text-rose-700 ring-rose-200",
  cart: "bg-sky-50 text-sky-700 ring-sky-200",
};
const customerTone = (value: unknown) =>
  value === "new"
    ? "bg-sky-50 text-sky-700 ring-sky-200"
    : value === "existing"
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : "bg-[#f1f2f4] text-[#666b70] ring-[#e1e3e6]";
const day = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(value);
const clock = (value: Date) =>
  new Intl.DateTimeFormat("th-TH", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(value);
const minutes = (from: Date, to: Date) => Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));

/** Rounds as expandable cards: when, customer type, final order as chips, then a timeline of every step. */
export function RoundList({
  rounds,
  openFirst = false,
  showCode = true,
}: {
  rounds: Activity[][];
  openFirst?: boolean;
  showCode?: boolean;
}) {
  if (rounds.length === 0) return <p className="p-6 text-center text-sm text-[#666b70]">ยังไม่มีกิจกรรม</p>;
  return (
    <ul className="space-y-3 p-3 sm:p-4">
      {rounds.map((list, index) => {
        const first = list[0];
        const last = list.at(-1)!;
        const customer = (list.findLast((e) => e.kind === "customer")?.detail as Detail | undefined)?.customer;
        const adds = list.filter((e) => e.kind === "add").length;
        const order = finalItems(list);
        const units = order.reduce((sum, o) => sum + o.units, 0);
        const ended = last.kind === "reset";
        return (
          <li key={first.id}>
            <details
              className="group overflow-hidden rounded-xl border border-[#e1e3e6] bg-white shadow-sm transition-shadow open:shadow-md"
              open={openFirst && index === 0}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-2.5 px-4 py-3 hover:bg-[#fafbfc] [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  {showCode && <span className="font-semibold">{first.code}</span>}
                  <span className="text-sm font-medium">{day(first.createdAt)}</span>
                  <span className="inline-flex items-center gap-1 text-sm tabular-nums text-[#666b70]">
                    <Clock className="size-3.5" aria-hidden />
                    {clock(first.createdAt)}–{clock(last.createdAt)}
                    <span className="text-xs">({minutes(first.createdAt, last.createdAt)} นาที)</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${customerTone(customer)}`}
                  >
                    {customerName(customer)}
                  </span>
                  {ended && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f2f4] px-2 py-0.5 text-xs text-[#666b70]">
                      <RotateCcw className="size-3" aria-hidden />
                      จบรอบด้วยล้างทั้งหมด
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-[#666b70]">
                    {list.length} ขั้น · เพิ่ม {adds} ครั้ง
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                  </span>
                </div>
                {order.length ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs text-[#666b70]">รายการสุดท้าย {units} เครื่อง</span>
                    {order.map((o) => (
                      <span
                        key={`${o.model}-${o.contract}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1e3e6] bg-[#f8f9fa] px-2 py-1 text-xs"
                      >
                        <span className="font-medium text-foreground">{o.model}</span>
                        <span className="text-[#666b70]">{o.contract}</span>
                        <span className="rounded bg-white px-1 font-semibold tabular-nums ring-1 ring-[#e1e3e6]">
                          ×{o.units}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9aa0a6]">รายการสุดท้าย: ไม่มีสินค้า</p>
                )}
              </summary>
              <ol className="relative border-t border-[#eef0f2] bg-[#fafbfc] px-4 py-3">
                {list.map((e, i) => {
                  const Icon = kindIcon[e.kind] ?? Eye;
                  return (
                    <li key={e.id} className="relative flex gap-3 pb-3 last:pb-0">
                      {i < list.length - 1 && (
                        <span className="absolute left-[13px] top-7 bottom-0 w-px bg-[#e1e3e6]" aria-hidden />
                      )}
                      <span
                        className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-inset ${kindTone[e.kind] ?? "bg-white text-[#666b70] ring-[#e1e3e6]"}`}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 pt-1 text-sm">
                        <span className="mr-2 text-xs tabular-nums text-[#9aa0a6]">{time(e.createdAt)}</span>
                        <span className="break-words">{describeActivity(e.kind, e.detail)}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
