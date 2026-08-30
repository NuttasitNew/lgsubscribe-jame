import {
  Award,
  Calendar,
  ClipboardCheck,
  House,
  PiggyBank,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Audience = {
  id: string;
  icon: LucideIcon;
  title: string;
  highlight?: string;
  text: string;
  panelClassName: string;
  visual: "home" | "cash" | "family" | "care";
};

const audiences: Audience[] = [
  {
    id: "new-home",
    icon: House,
    title: "คนกำลังแต่งบ้าน",
    text: "ต้องการเครื่องใช้ไฟฟ้าใหม่หลายชิ้น แต่ต้องการบริหารค่าใช้จ่ายเป็นรายเดือน",
    panelClassName: "from-[#fff1e8] to-[#ffe4d6]",
    visual: "home",
  },
  {
    id: "cash-flow",
    icon: PiggyBank,
    title: "คนที่ต้องการบริหาร",
    highlight: "Cash Flow",
    text: "แทนที่จะจ่ายค่าเครื่องเป็นก้อน สามารถเลือกแผนค่าบริการรายเดือนตามเงื่อนไขที่กำหนด",
    panelClassName: "from-[#fff6e5] to-[#ffe9c7]",
    visual: "cash",
  },
  {
    id: "family",
    icon: Users,
    title: "ครอบครัว",
    text: "ต้องการเครื่องใช้ไฟฟ้าที่ตอบโจทย์การใช้งานในชีวิตประจำวัน พร้อมบริการตามแพ็กเกจ",
    panelClassName: "from-[#fff0f2] to-[#ffd9e0]",
    visual: "family",
  },
  {
    id: "peace-of-mind",
    icon: ShieldCheck,
    title: "คนที่ต้องการความสะดวกและอุ่นใจ",
    text: "เลือกสินค้า พร้อมบริการดูแล และประกันตลอดอายุสัญญา",
    panelClassName: "from-[#fff0f2] to-[#ffd4dc]",
    visual: "care",
  },
];

const benefits = [
  { icon: Calendar, title: "จ่ายรายเดือน", text: "สบายกระเป๋า" },
  { icon: Truck, title: "บริการจัดส่ง", text: "และติดตั้ง" },
  { icon: ShieldCheck, title: "บริการดูแล", text: "ตลอดสัญญา" },
  { icon: Award, title: "มั่นใจด้วย", text: "ประกันสินค้า" },
] as const;

export function WhoIsSubscribeFor() {
  return (
    <section
      id="who"
      aria-labelledby="who-is-subscribe-for-heading"
      className="mt-16 scroll-mt-32"
    >
      <div className="text-center">
        <p className="eyebrow">LG Subscribe</p>
        <h2
          id="who-is-subscribe-for-heading"
          aria-label="LG Subscribe เหมาะกับใคร?"
          className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
        >
          <span aria-hidden="true" className="text-primary">
            LG Subscribe
          </span>
          <span aria-hidden="true" className="mt-1 block text-neutral-950">
            เหมาะกับใคร?
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          ใช้งานเครื่องใช้ไฟฟ้าแบรนด์ LG แบบสบายใจ{" "}
          <span className="inline-block font-semibold text-primary">ในรูปแบบรายเดือน</span>
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {audiences.map((item) => (
          <article
            key={item.id}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-[#fffaf8] shadow-[0_8px_24px_rgba(139,21,48,0.08)] sm:flex-row"
          >
            <div
              className={cn(
                "relative grid min-h-[110px] place-items-center bg-gradient-to-br sm:min-h-[140px] sm:w-[42%]",
                item.panelClassName,
              )}
            >
              <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-primary text-white shadow-sm">
                <item.icon className="size-4" strokeWidth={2} aria-hidden="true" />
              </span>
              <AudienceVisual visual={item.visual} />
            </div>
            <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
              <h3 className="text-xl font-bold leading-snug text-neutral-950">
                {item.title}
                {item.highlight ? (
                  <>
                    {" "}
                    <span className="text-primary">{item.highlight}</span>
                  </>
                ) : null}
              </h3>
              <p className="mt-2 text-sm leading-7 text-neutral-600">{item.text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-primary px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 rounded-2xl bg-white px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {benefits.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white">
                <item.icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <p className="text-sm font-bold leading-5 text-neutral-900">
                {item.title}
                <span className="block text-neutral-700">{item.text}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-lg font-bold text-white sm:text-xl">
          ชีวิตที่ดีกว่า เริ่มต้นง่าย ๆ ด้วย LG Subscribe
        </p>
      </div>
      <p className="mt-4 text-center text-sm leading-7 text-muted-foreground">
        หากตั้งใจใช้งานระยะสั้นหรืออาจย้ายที่อยู่บ่อย ควรสอบถามข้อจำกัดและค่าใช้จ่ายล่วงหน้า
      </p>
    </section>
  );
}

function AudienceVisual({ visual }: { visual: Audience["visual"] }) {
  if (visual === "cash") {
    return (
      <span className="flex items-center gap-2 text-primary">
        <ClipboardCheck className="size-10" strokeWidth={1.6} aria-hidden="true" />
        <PiggyBank className="size-12" strokeWidth={1.6} aria-hidden="true" />
      </span>
    );
  }

  if (visual === "care") {
    return (
      <span className="flex items-center gap-2 text-primary">
        <Wrench className="size-9" strokeWidth={1.6} aria-hidden="true" />
        <ShieldCheck className="size-12" strokeWidth={1.6} aria-hidden="true" />
      </span>
    );
  }

  const Icon = visual === "family" ? Users : House;
  return <Icon className="size-14 text-primary" strokeWidth={1.6} aria-hidden="true" />;
}
