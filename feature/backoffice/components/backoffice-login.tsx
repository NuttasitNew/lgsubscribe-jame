import { ArrowRight, Database, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

const accessNotes = [
  { icon: Database, label: "ข้อมูลอยู่ใน Neon Postgres" },
  { icon: ShieldCheck, label: "ตรวจสิทธิ์ก่อนเข้าทุกหน้าภายใน" },
  { icon: LockKeyhole, label: "ไม่แสดงเส้นทางใน sitemap" },
] as const;

export function BackofficeLogin() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#e7e9eb] px-4 py-6 text-[#1d1f22] sm:px-6 sm:py-10">
      <section className="w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[#d0d3d6] bg-white shadow-[0_24px_80px_rgba(20,22,24,0.09)]">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden bg-[#1b1d20] px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[650px] lg:px-12 lg:py-12">
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[#c4142e] text-sm font-bold">
                  LG
                </div>
                <div>
                  <p className="text-sm font-semibold">Content Desk</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/45">
                    Internal operations
                  </p>
                </div>
              </div>

              <div className="mt-16 max-w-md lg:mt-auto lg:pb-12">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#ef7184]">
                  Private workspace
                </p>
                <h1 className="mt-4 text-3xl font-semibold leading-[1.2] tracking-[-0.04em] sm:text-4xl">
                  พื้นที่ทำงานสำหรับ
                  <br />
                  ทีมดูแลเนื้อหา
                </h1>
                <p className="mt-5 max-w-sm text-sm leading-7 text-white/58">
                  ตรวจคำถามจากลูกค้า วิเคราะห์หัวข้อ และอนุมัติบทความก่อนเผยแพร่
                  โดยแยกออกจากเว็บไซต์ลูกค้าอย่างชัดเจน
                </p>
              </div>

              <div className="mt-10 grid gap-3 border-t border-white/10 pt-6 lg:mt-0">
                {accessNotes.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 text-xs text-white/62">
                    <span className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                      <Icon className="size-3.5 text-[#ef7184]" strokeWidth={1.7} />
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full border border-white/[0.05]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 -right-20 size-64 rounded-full border border-[#c4142e]/20"
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:px-14">
            <div className="rounded-xl border border-[#ecd0d5] bg-[#fbf1f3] px-4 py-3 text-xs leading-5 text-[#8f1428]">
              <div className="flex items-center gap-2 font-semibold">
                <LockKeyhole className="size-3.5" /> ระบบเข้าสู่ระบบยังไม่เปิดใช้งาน
              </div>
              <p className="mt-1 pl-[1.375rem] text-[#9a4b58]">
                หน้านี้แสดงได้เฉพาะ local design preview เท่านั้น
              </p>
            </div>

            <div className="mt-9">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#a80f28]">
                Secure access
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                เข้าสู่ Backoffice
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#74797e]">
                ใช้บัญชีที่ได้รับอนุญาตจากผู้ดูแลระบบเท่านั้น
              </p>
            </div>

            <div className="mt-8 space-y-5" aria-label="แบบร่างฟอร์มเข้าสู่ระบบ">
              <label className="block">
                <span className="text-sm font-medium text-[#373a3e]">อีเมล</span>
                <input
                  type="email"
                  disabled
                  placeholder="name@company.com"
                  className="mt-2 h-12 w-full rounded-xl border border-[#d5d8db] bg-[#f5f6f7] px-4 text-sm text-[#777c81] outline-none placeholder:text-[#a3a7ab] disabled:cursor-not-allowed"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#373a3e]">รหัสผ่าน</span>
                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#969a9e]" />
                  <input
                    type="password"
                    disabled
                    placeholder="••••••••••••"
                    className="h-12 w-full rounded-xl border border-[#d5d8db] bg-[#f5f6f7] pl-11 pr-4 text-sm text-[#777c81] outline-none placeholder:text-[#a3a7ab] disabled:cursor-not-allowed"
                  />
                </div>
              </label>

              <button
                type="button"
                disabled
                className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#c8cacc] text-sm font-semibold text-white"
              >
                เข้าสู่ระบบ <ArrowRight className="size-4" />
              </button>
            </div>

            <p className="mt-8 border-t border-[#e1e3e5] pt-5 text-center text-xs leading-5 text-[#858a8f]">
              การเข้าถึงและกิจกรรมภายในระบบจะถูกบันทึกเพื่อตรวจสอบความปลอดภัย
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
