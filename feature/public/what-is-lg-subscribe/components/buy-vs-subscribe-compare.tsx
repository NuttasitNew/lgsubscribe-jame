import {
  CircleDollarSign,
  Headset,
  Heart,
  House,
  Pointer,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CompareSide = {
  title?: string;
  text?: string;
  badge?: string;
};

type CompareRow = {
  id: string;
  icon: LucideIcon;
  title: string;
  buy: CompareSide | null;
  subscribe: CompareSide;
};

const compareRows: CompareRow[] = [
  {
    id: "upfront-cost",
    icon: CircleDollarSign,
    title: "ค่าใช้จ่ายเริ่มต้น",
    buy: { text: "จ่ายก้อนใหญ่ครั้งเดียว" },
    subscribe: { text: "เริ่มต้นจ่ายสบาย ๆ เป็นรายเดือน" },
  },
  {
    id: "ownership",
    icon: House,
    title: "การเป็นเจ้าของ",
    buy: { text: "เป็นเจ้าของทันที" },
    subscribe: { text: "ใช้งานสินค้าได้โดยไม่ต้องจ่ายเต็มก้อน" },
  },
  {
    id: "care",
    icon: Headset,
    title: "บริการดูแล / ซ่อมบำรุง",
    buy: { text: "อาจมีค่าใช้จ่ายเพิ่มเติมภายหลัง" },
    subscribe: {
      badge: "มีประกันฯ",
      text: "มีบริการดูแล พร้อมประกันตลอดอายุสัญญา",
    },
  },
  {
    id: "flexibility",
    icon: Wallet,
    title: "ความยืดหยุ่น",
    buy: { text: "จ่ายครั้งเดียว ตัดสินใจครั้งเดียว" },
    subscribe: { text: "บริหารค่าใช้จ่ายได้ง่ายกว่า" },
  },
  {
    id: "convenience",
    icon: Pointer,
    title: "ความสะดวก",
    buy: { title: "ความสะดวกในการเริ่มใช้", text: "ต้องเตรียมงบมากกว่า" },
    subscribe: {
      title: "ความสะดวกในการชำระเงิน",
      badge: "ไม่ล็อควงเงิน",
      text: "ชำระผ่านบัตรเครดิต ไม่ล็อควงเงินบัตร",
    },
  },
  {
    id: "warranty",
    icon: ShieldCheck,
    title: "มีประกันตลอดอายุสัญญา",
    buy: null,
    subscribe: { badge: "อุ่นใจตลอดสัญญา" },
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

      <div className="mt-10 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-black/[0.07] lg:shadow-[0_8px_24px_rgba(139,21,48,0.08)]">
        <div className="hidden lg:grid lg:grid-cols-[minmax(15.5rem,0.8fr)_1fr_1fr]">
          <div className="bg-white" />
          <h3 className="bg-[#7a1528] px-6 py-4 text-center text-2xl font-bold text-white">ซื้อสด</h3>
          <h3 className="bg-primary px-6 py-4 text-center text-2xl font-bold text-white">
            Subscribe
          </h3>
        </div>

        <ul className="grid gap-4 lg:gap-0 lg:divide-y lg:divide-black/[0.06]">
          {compareRows.map((row) => (
            <li key={row.id}>
              <article
                aria-labelledby={`compare-${row.id}`}
                className={cn(
                  "overflow-hidden rounded-2xl border border-black/[0.07] bg-[#fff8f8] shadow-[0_8px_24px_rgba(139,21,48,0.06)]",
                  "lg:grid lg:grid-cols-[minmax(15.5rem,0.8fr)_1fr_1fr] lg:rounded-none lg:border-0 lg:bg-white lg:shadow-none",
                )}
              >
                <div className="flex items-center gap-3 px-4 py-3.5 lg:items-start lg:gap-4 lg:px-6 lg:py-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-primary bg-white text-primary">
                    <row.icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <p
                    id={`compare-${row.id}`}
                    className="text-base font-bold leading-6 text-neutral-950 lg:pt-2.5"
                  >
                    {row.title}
                  </p>
                </div>

                <div
                  className={cn(
                    "grid gap-2 px-3 pb-3",
                    row.buy ? "grid-cols-1 min-[420px]:grid-cols-2" : "grid-cols-1",
                    "lg:contents",
                  )}
                >
                  <ComparePanel side="buy" item={row.buy} rowTitle={row.title} />
                  <ComparePanel side="subscribe" item={row.subscribe} rowTitle={row.title} />
                </div>
              </article>
            </li>
          ))}
        </ul>
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

function ComparePanel({
  side,
  item,
  rowTitle,
}: {
  side: "buy" | "subscribe";
  item: CompareSide | null;
  rowTitle: string;
}) {
  const isSubscribe = side === "subscribe";
  const label = isSubscribe ? "Subscribe" : "ซื้อสด";

  if (!item) {
    return (
      <div className="hidden lg:flex lg:items-center lg:px-6 lg:py-5">
        <span className="text-neutral-300" aria-hidden="true">
          —
        </span>
      </div>
    );
  }

  const showTitle = Boolean(item.title && item.title !== rowTitle);

  return (
    <div
      className={cn(
        "rounded-xl px-3.5 py-3",
        isSubscribe
          ? "bg-primary/[0.07] ring-1 ring-primary/15"
          : "bg-white ring-1 ring-black/[0.06]",
        "lg:flex lg:flex-col lg:justify-center lg:rounded-none lg:px-6 lg:py-5 lg:ring-0",
        isSubscribe ? "lg:bg-[#fff5f6]" : "lg:bg-white",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-bold tracking-wide lg:hidden",
          isSubscribe ? "text-primary" : "text-[#7a1528]",
        )}
      >
        {label}
      </p>
      {showTitle || item.badge ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 lg:mt-0">
          {showTitle ? (
            <p className="text-sm font-bold leading-5 text-neutral-950">{item.title}</p>
          ) : null}
          {item.badge ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {item.badge}
            </span>
          ) : null}
        </div>
      ) : null}
      {item.text ? (
        <p
          className={cn(
            "text-sm leading-6 text-neutral-600",
            showTitle || item.badge ? "mt-1" : "mt-0.5 lg:mt-0",
          )}
        >
          {item.text}
        </p>
      ) : null}
    </div>
  );
}
