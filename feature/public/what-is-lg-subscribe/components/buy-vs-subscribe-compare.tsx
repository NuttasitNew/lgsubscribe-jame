import {
  Calendar,
  CalendarDays,
  ChartColumn,
  CircleDollarSign,
  FileCheck,
  Headset,
  Heart,
  House,
  Pointer,
  ShieldCheck,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CompareItem = {
  icon: LucideIcon;
  title: string;
  text?: string;
  badge?: string;
};

const buyOutrightItems: CompareItem[] = [
  { icon: CircleDollarSign, title: "ค่าใช้จ่ายเริ่มต้น", text: "จ่ายก้อนใหญ่ครั้งเดียว" },
  { icon: House, title: "การเป็นเจ้าของ", text: "เป็นเจ้าของทันที" },
  { icon: Wrench, title: "บริการดูแล / ซ่อมบำรุง", text: "อาจมีค่าใช้จ่ายเพิ่มเติมภายหลัง" },
  { icon: CalendarDays, title: "ความยืดหยุ่น", text: "จ่ายครั้งเดียว ตัดสินใจครั้งเดียว" },
  { icon: Wallet, title: "ความสะดวกในการเริ่มใช้", text: "ต้องเตรียมงบมากกว่า" },
];

const subscribeItems: CompareItem[] = [
  { icon: Calendar, title: "ค่าใช้จ่ายเริ่มต้น", text: "เริ่มต้นจ่ายสบาย ๆ เป็นรายเดือน" },
  { icon: FileCheck, title: "การเป็นเจ้าของ", text: "ใช้งานสินค้าได้โดยไม่ต้องจ่ายเต็มก้อน" },
  {
    icon: Headset,
    title: "บริการดูแล / ซ่อมบำรุง",
    badge: "มีประกันฯ",
    text: "มีบริการดูแล พร้อมประกันตลอดอายุสัญญา",
  },
  { icon: ChartColumn, title: "ความยืดหยุ่น", text: "บริหารค่าใช้จ่ายได้ง่ายกว่า" },
  {
    icon: Pointer,
    title: "ความสะดวกในการชำระเงิน",
    badge: "ไม่ล็อควงเงิน",
    text: "ชำระผ่านบัตรเครดิต ไม่ล็อควงเงินบัตร",
  },
  {
    icon: ShieldCheck,
    title: "มีประกันตลอดอายุสัญญา",
    badge: "อุ่นใจตลอดสัญญา",
  },
];

export function BuyVsSubscribeCompare() {
  return (
    <section
      id="compare"
      aria-labelledby="buy-vs-subscribe-heading"
      className="mt-16 scroll-mt-32"
    >
      <div className="text-center">
        <p className="eyebrow">LG Subscribe</p>
        <h2
          id="buy-vs-subscribe-heading"
          aria-label="ซื้อสด vs Subscribe ต่างกันยังไง?"
          className="mt-3 text-3xl font-bold leading-tight tracking-tight text-neutral-950 sm:text-4xl lg:text-5xl"
        >
          <span aria-hidden="true" className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            ซื้อสด
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-sm font-black tracking-wide text-white sm:size-12 sm:text-base">
              VS
            </span>
            <span className="text-primary">Subscribe</span>
          </span>
          <span aria-hidden="true" className="mt-2 block">
            ต่างกันยังไง?
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          เปรียบเทียบแบบชัด ๆ เพื่อช่วยให้ตัดสินใจง่ายขึ้น
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2 lg:items-stretch">
        <CompareColumn title="ซื้อสด" headerClassName="bg-[#7a1528]" items={buyOutrightItems} />
        <CompareColumn
          title="Subscribe"
          headerClassName="bg-primary"
          items={subscribeItems}
          emphasized
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#8b1530] via-[#d4b072] to-[#8b1530] p-[2px] shadow-[0_10px_28px_rgba(139,21,48,0.18)]">
        <div className="flex flex-col items-center gap-4 rounded-[0.9rem] bg-gradient-to-r from-[#fff3e0] via-[#fffaf2] to-[#fff3e0] px-5 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#d21f3c] to-[#8b1530] text-white shadow-md ring-2 ring-[#e8c07a]">
            <Heart className="size-6 fill-white" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold leading-snug text-neutral-950 sm:text-xl">
              LG Subscribe เหมาะสำหรับคนที่อยากใช้สินค้าคุณภาพ
            </p>
            <p className="mt-1 text-xl font-bold leading-snug text-primary sm:text-2xl">
              พร้อมบริหารค่าใช้จ่ายแบบสบายใจ
            </p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        *รายละเอียดและเงื่อนไขเป็นไปตามที่บริษัทกำหนด
      </p>
    </section>
  );
}

function CompareColumn({
  title,
  headerClassName,
  items,
  emphasized = false,
}: {
  title: string;
  headerClassName: string;
  items: CompareItem[];
  emphasized?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-[#fff8f8] shadow-[0_8px_24px_rgba(139,21,48,0.08)]",
        emphasized ? "border-primary/25" : "border-black/[0.07]",
      )}
    >
      <h3 className={cn("px-6 py-4 text-center text-2xl font-bold text-white", headerClassName)}>
        {title}
      </h3>
      <ul className="grid flex-1 content-start gap-1 px-5 py-4 sm:px-6">
        {items.map((item) => (
          <li key={`${title}-${item.title}`} className="flex items-start gap-3 py-3.5 sm:gap-4">
            <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-primary bg-white text-primary">
              <item.icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-bold leading-6 text-neutral-950">{item.title}</p>
                {item.badge ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              {item.text ? (
                <p className="mt-1 text-sm leading-6 text-neutral-600">{item.text}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
