import {
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
import type { BackofficeLineOverview } from "@/feature/backoffice/get-line-dashboard";

const navItems = [
  { label: "ภาพรวม", icon: LayoutDashboard, active: true },
  { label: "ผู้ใช้ LINE", icon: MessageCircle, active: false },
  { label: "ข้อความ LINE", icon: Inbox, active: false },
  { label: "บทความ", icon: FileText, active: false },
  { label: "คำค้นหา", icon: Search, active: false },
  { label: "ตั้งค่าระบบ", icon: Settings, active: false },
] as const;

const bangkokDateTime = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  dateStyle: "medium",
  timeStyle: "short",
});

const bangkokDate = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  dateStyle: "long",
});

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

export function BackofficeDashboard({ lineOverview }: { lineOverview: BackofficeLineOverview }) {
  const pipeline = [
    {
      label: "รับ LINE webhook",
      detail: lineOverview.lineConfigured
        ? `${lineOverview.messagesToday} ข้อความวันนี้`
        : "รอ LINE credentials",
      state: lineOverview.lineConfigured ? "ready" : "waiting",
    },
    {
      label: "บันทึก Neon",
      detail: `${lineOverview.totalUsers} LINE users`,
      state: lineOverview.databaseConnected ? "ready" : "waiting",
    },
    { label: "วิเคราะห์", detail: "ยังไม่ส่งข้อมูลให้ AI", state: "locked" },
    { label: "ตรวจเผยแพร่", detail: "รอระบบอนุมัติ", state: "locked" },
  ] as const;

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
              เชื่อมข้อมูล Neon แล้ว แต่ยังเปิดเฉพาะ local preview จนกว่าจะมีระบบ Auth จริง
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
                    ข้อมูลจริงจาก Neon Development
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Circle className="size-2 fill-[#4fc38a] text-[#4fc38a]" /> ฐานข้อมูลเชื่อมต่อแล้ว
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
                  <p className="mt-1 text-sm font-medium">{bangkokDate.format(new Date())} · กรุงเทพฯ</p>
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
                    {step.state === "ready" ? (
                      <Check className="size-4 text-[#16794f]" />
                    ) : step.state === "waiting" ? (
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
              eyebrow="LINE messages"
              title="ข้อความล่าสุดจาก LINE"
              description="ข้อความจริงที่ webhook บันทึกไว้ ใช้ตรวจการรับข้อมูลก่อนเข้าสู่กระบวนการวิเคราะห์"
            />
            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(250px,0.7fr)]">
              <div className="overflow-hidden rounded-2xl border border-[#dcdee0] bg-white">
                <div className="flex items-center justify-between border-b border-[#e0e2e4] px-5 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Inbox className="size-4 text-[#a80f28]" /> ข้อความที่รับเข้าระบบ
                  </div>
                  <span className="text-xs text-[#777c81]">
                    ล่าสุด {lineOverview.recentMessages.length} รายการ
                  </span>
                </div>
                <div className="divide-y divide-[#e6e7e9]">
                  {lineOverview.recentMessages.map((message) => (
                    <article
                      key={message.id}
                      className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium leading-6 text-[#25282c]">{message.text}</p>
                        <p className="mt-1.5 text-xs text-[#7b8085]">{message.displayName}</p>
                      </div>
                      <span className="text-xs text-[#6f7479]">
                        {bangkokDateTime.format(message.occurredAt)}
                      </span>
                    </article>
                  ))}
                  {lineOverview.recentMessages.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-[#777c81]">ยังไม่มีข้อความ LINE ในฐานข้อมูล</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl bg-[#c4142e] p-5 text-white">
                <Sparkles className="size-5" strokeWidth={1.7} />
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  สถานะวันนี้
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-8">
                  {lineOverview.messagesToday} ข้อความเข้า
                </h3>
                <p className="mt-4 text-sm leading-6 text-white/75">
                  ผู้ใช้ทั้งหมด {lineOverview.totalUsers} คน · กำลังติดตาม OA {lineOverview.followingUsers} คน
                </p>
                <div className="mt-7 border-t border-white/20 pt-4 text-xs text-white/65">
                  {lineOverview.failedEvents > 0
                    ? `มี event ประมวลผลไม่สำเร็จ ${lineOverview.failedEvents} รายการ`
                    : "ไม่พบ event ที่ประมวลผลล้มเหลว"}
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
              eyebrow="LINE users"
              title="ผู้ใช้ LINE ล่าสุด"
              description="แยก LINE identity ออกจากข้อมูลลูกค้าธุรกิจ เพื่อเก็บผู้ติดตามและผู้ที่เพิ่งเริ่มสนทนาได้ครบ"
            />
            <div className="mt-6 space-y-3">
              {lineOverview.recentUsers.map((user, index) => (
                <article
                  key={user.userLineId}
                  className="grid gap-4 rounded-2xl border border-[#dcdee0] bg-white p-5 lg:grid-cols-[44px_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-[#f0f1f2] text-sm font-semibold text-[#74797e]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-6 text-[#24272a] sm:text-base">
                      {user.displayName}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#777c81]">
                      <span className="max-w-[20rem] truncate">LINE ID: {user.userLineId}</span>
                      <span aria-hidden="true">•</span>
                      <span>{user.lastMessage ?? "ยังไม่มีข้อความ"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-self-start rounded-full border border-[#dddfe1] px-3 py-1.5 text-xs font-medium text-[#5e6368] lg:justify-self-end">
                    {user.isFollowing ? (
                      <Check className="size-3.5 text-[#16794f]" />
                    ) : (
                      <Circle className="size-3" />
                    )}
                    {user.isFollowing ? "กำลังติดตาม" : "เลิกติดตาม"}
                  </div>
                </article>
              ))}
              {lineOverview.recentUsers.length === 0 ? (
                <p className="rounded-2xl border border-[#dcdee0] bg-white px-5 py-8 text-sm text-[#777c81]">
                  ยังไม่มีผู้ใช้ LINE ในฐานข้อมูล
                </p>
              ) : null}
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
                ["Neon Database", "เชื่อมต่อแล้ว", lineOverview.databaseConnected],
                [
                  "LINE webhook",
                  lineOverview.lineConfigured ? "พร้อมรับข้อมูลจริง" : "รอ LINE credentials",
                  lineOverview.lineConfigured,
                ],
                ["OpenAI API", "ยังไม่ตั้งค่า", false],
                ["สิทธิ์การเข้าถึง", "จำกัดเฉพาะ local", true],
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
            <p>LG Subscribe Content Desk · Neon Development</p>
            <p>หน้า local preview เท่านั้น · ห้ามเปิด production ก่อนมี Auth</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
