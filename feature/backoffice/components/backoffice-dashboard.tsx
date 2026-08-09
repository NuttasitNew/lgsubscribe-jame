import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  FileText,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

const pipeline = [
  { label: "รับคำถาม", detail: "รอ LINE webhook", state: "waiting" },
  { label: "วิเคราะห์", detail: "จัดกลุ่มความต้องการ", state: "locked" },
  { label: "ร่างบทความ", detail: "OpenAI + SEO", state: "locked" },
  { label: "ตรวจเผยแพร่", detail: "รอผู้ดูแลอนุมัติ", state: "locked" },
] as const;

const questions = [
  { question: "เครื่องซักผ้ารุ่นไหนเหมาะกับครอบครัว 4 คน", group: "เลือกสินค้า", count: 12 },
  { question: "เช่าเครื่องฟอกอากาศรวมเปลี่ยนไส้กรองไหม", group: "บริการหลังการขาย", count: 8 },
  { question: "ตู้เย็นแบบรายเดือนต่างจากผ่อนอย่างไร", group: "เงื่อนไขบริการ", count: 6 },
] as const;

const articles = [
  {
    title: "เลือกเครื่องซักผ้าสำหรับครอบครัว 4 คน ต้องดูอะไรบ้าง",
    keyword: "เครื่องซักผ้าครอบครัว 4 คน",
    status: "รอตรวจ",
    updated: "ฉบับร่างตัวอย่าง",
  },
  {
    title: "เช่าเครื่องฟอกอากาศรายเดือน รวมบริการอะไรบ้าง",
    keyword: "เช่าเครื่องฟอกอากาศ",
    status: "กำลังค้นคว้า",
    updated: "ข้อมูลตัวอย่าง",
  },
] as const;

const navItems = [
  { label: "ภาพรวม", icon: LayoutDashboard, active: true },
  { label: "คำถามลูกค้า", icon: MessageCircle, active: false },
  { label: "บทความ", icon: FileText, active: false },
  { label: "คำค้นหา", icon: Search, active: false },
  { label: "ตั้งค่าระบบ", icon: Settings, active: false },
] as const;

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#d9dcdf] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#a80f28]">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[#181a1d] sm:text-2xl">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-[#666b70] sm:text-right">{description}</p>
    </div>
  );
}

export function BackofficeDashboard() {
  return (
    <div className="min-h-screen bg-[#eef0f2] text-[#1d1f22]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#d4d7da] bg-[#e5e7e9] px-5 py-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-[#cfd2d5] pb-6">
            <div className="grid size-9 place-items-center rounded-[0.65rem] bg-[#c4142e] text-sm font-bold text-white">
              LG
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Content Desk</p>
              <p className="mt-1.5 text-[0.68rem] uppercase tracking-[0.16em] text-[#73777c]">Backoffice</p>
            </div>
          </div>

          <nav className="mt-7 space-y-1" aria-label="เมนู Backoffice">
            {navItems.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-[#1c1e21] text-white" : "text-[#5d6267]"
                }`}
              >
                <Icon className="size-4" strokeWidth={1.8} />
                {label}
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-[#cfd2d5] bg-[#eceeef] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#303338]">
              <LockKeyhole className="size-3.5 text-[#a80f28]" />
              ปิดการเข้าถึงอยู่
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6f7479]">
              หน้านี้เป็นแบบร่างในเครื่อง ยังไม่เชื่อม Auth หรือข้อมูลจริง
            </p>
          </div>
        </aside>

        <main id="backoffice-main" className="min-w-0 px-4 py-4 sm:px-6 sm:py-6 xl:px-10 xl:py-8">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#d5d8db] bg-[#f7f8f8] px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-[#c4142e] text-xs font-bold text-white">
                LG
              </div>
              <div>
                <p className="text-sm font-semibold">Content Desk</p>
                <p className="text-[0.65rem] text-[#74797e]">หน้าออกแบบภายใน</p>
              </div>
            </div>
            <LockKeyhole className="size-4 text-[#a80f28]" />
          </div>

          <header className="overflow-hidden rounded-[1.6rem] bg-[#1b1d20] text-white">
            <div className="grid gap-8 px-5 py-7 sm:px-8 sm:py-9 xl:grid-cols-[1fr_auto] xl:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span className="rounded-full border border-white/15 px-3 py-1">
                    ข้อมูลตัวอย่างสำหรับออกแบบ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Circle className="size-2 fill-[#e53b55] text-[#e53b55]" /> ระบบยังไม่เปิดใช้งาน
                  </span>
                </div>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#ef7184]">
                  Daily content operations
                </p>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl xl:text-[2.8rem] xl:leading-[1.12]">
                  เปลี่ยนคำถามของลูกค้า
                  <br className="hidden sm:block" /> ให้เป็นบทความที่ตอบได้จริง
                </h1>
              </div>
              <div className="flex items-center gap-3 border-t border-white/10 pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                <CalendarDays className="size-5 text-[#ef7184]" strokeWidth={1.7} />
                <div>
                  <p className="text-xs text-white/50">รอบข้อมูลประจำวัน</p>
                  <p className="mt-1 text-sm font-medium">10 สิงหาคม 2569 · กรุงเทพฯ</p>
                </div>
              </div>
            </div>
          </header>

          <section
            className="mt-4 rounded-[1.6rem] border border-[#d8dbde] bg-[#f8f9f9] p-5 sm:p-7"
            aria-labelledby="pipeline-title"
          >
            <SectionHeading
              id="pipeline-title"
              eyebrow="Today's flow"
              title="เส้นทางงานวันนี้"
              description="เห็นจุดที่ระบบหยุดอยู่ทันที ก่อนข้อมูลจะถูกส่งต่อไปขั้นถัดไป"
            />
            <ol className="mt-6 grid gap-3 md:grid-cols-4">
              {pipeline.map((step, index) => (
                <li key={step.label} className="relative rounded-2xl border border-[#dcdee0] bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-7 place-items-center rounded-full bg-[#f4dce0] text-xs font-bold text-[#a80f28]">
                      {index + 1}
                    </span>
                    {step.state === "waiting" ? (
                      <Clock3 className="size-4 text-[#a80f28]" />
                    ) : (
                      <LockKeyhole className="size-4 text-[#9b9fa3]" />
                    )}
                  </div>
                  <p className="mt-5 text-sm font-semibold">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#74797e]">{step.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="mt-4 rounded-[1.6rem] border border-[#d8dbde] bg-[#f8f9f9] p-5 sm:p-7"
            aria-labelledby="signals-title"
          >
            <SectionHeading
              id="signals-title"
              eyebrow="Customer signals"
              title="คำถามที่ลูกค้าถามซ้ำ"
              description="รวมเฉพาะข้อความที่ตัดข้อมูลส่วนบุคคลแล้ว เพื่อใช้ตัดสินใจว่าจะเขียนเรื่องอะไร"
            />
            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(250px,0.7fr)]">
              <div className="overflow-hidden rounded-2xl border border-[#dcdee0] bg-white">
                <div className="flex items-center justify-between border-b border-[#e0e2e4] px-5 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Inbox className="size-4 text-[#a80f28]" /> หัวข้อที่พบวันนี้
                  </div>
                  <span className="text-xs text-[#777c81]">ตัวอย่าง 3 กลุ่ม</span>
                </div>
                <div className="divide-y divide-[#e6e7e9]">
                  {questions.map((item) => (
                    <article
                      key={item.question}
                      className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium leading-6 text-[#25282c]">{item.question}</p>
                        <p className="mt-1.5 text-xs text-[#7b8085]">{item.group}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span className="text-xs text-[#6f7479]">พบ {item.count} ครั้ง</span>
                        <ArrowUpRight className="size-4 text-[#9a9ea2]" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#c4142e] p-5 text-white">
                <Sparkles className="size-5" strokeWidth={1.7} />
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  หัวข้อแนะนำ
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-8">
                  คู่มือเลือกเครื่องซักผ้าตามจำนวนสมาชิกในบ้าน
                </h3>
                <p className="mt-4 text-sm leading-6 text-white/75">
                  สัญญาณจากคำถามซ้ำชัดที่สุด แต่ยังต้องตรวจ keyword และข้อมูลสินค้าจริงก่อนสร้างร่าง
                </p>
                <div className="mt-7 border-t border-white/20 pt-4 text-xs text-white/65">
                  ยังไม่ส่งข้อมูลไป OpenAI
                </div>
              </div>
            </div>
          </section>

          <section
            className="mt-4 rounded-[1.6rem] border border-[#d8dbde] bg-[#f8f9f9] p-5 sm:p-7"
            aria-labelledby="articles-title"
          >
            <SectionHeading
              id="articles-title"
              eyebrow="Editorial queue"
              title="คิวบทความ"
              description="ทุกบทความหยุดที่ฉบับร่างจนกว่าผู้ดูแลจะตรวจและกดอนุมัติ"
            />
            <div className="mt-6 space-y-3">
              {articles.map((article, index) => (
                <article
                  key={article.title}
                  className="grid gap-4 rounded-2xl border border-[#dcdee0] bg-white p-5 lg:grid-cols-[44px_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-[#f0f1f2] text-sm font-semibold text-[#74797e]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-6 text-[#24272a] sm:text-base">
                      {article.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#777c81]">
                      <span>คำค้นหา: {article.keyword}</span>
                      <span aria-hidden="true">•</span>
                      <span>{article.updated}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-self-start rounded-full border border-[#dddfe1] px-3 py-1.5 text-xs font-medium text-[#5e6368] lg:justify-self-end">
                    <Clock3 className="size-3.5" /> {article.status}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            className="mt-4 rounded-[1.6rem] border border-[#d8dbde] bg-[#f8f9f9] p-5 sm:p-7"
            aria-labelledby="readiness-title"
          >
            <SectionHeading
              id="readiness-title"
              eyebrow="System readiness"
              title="สถานะการเชื่อมต่อ"
              description="รายการนี้แสดงสิ่งที่ต้องเปิดให้ครบก่อนอนุญาตเข้าใช้งานจริง"
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Neon Auth", "ยังไม่เปิด", false],
                ["LINE webhook", "ยังไม่เชื่อม", false],
                ["OpenAI API", "ยังไม่ตั้งค่า", false],
                ["สิทธิ์การเข้าถึง", "ล็อกอยู่", true],
              ].map(([label, status, safe]) => (
                <div key={String(label)} className="rounded-2xl border border-[#dcdee0] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{label}</p>
                    {safe ? (
                      <Check className="size-4 text-[#16794f]" />
                    ) : (
                      <Circle className="size-3 text-[#a9adb1]" />
                    )}
                  </div>
                  <p className={`mt-5 text-xs font-medium ${safe ? "text-[#16794f]" : "text-[#7a7f84]"}`}>
                    {status}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <footer className="flex flex-col gap-2 px-1 pb-4 pt-6 text-xs text-[#777c81] sm:flex-row sm:items-center sm:justify-between">
            <p>LG Subscribe Content Desk · แบบร่างหน้าจอภายใน</p>
            <p>ไม่มีข้อมูลลูกค้าจริงในหน้านี้</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
