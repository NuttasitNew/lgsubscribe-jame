"use client";

import { useActionState } from "react";
import {
  importCsv,
  saveKeyword,
  seedKeywords,
  syncKeywords,
  toggleKeyword,
  type ActionResult,
} from "./actions";
const initial: ActionResult = { ok: false, message: "" };
const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-lg bg-[#bd1230] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
function Feedback({ state }: { state: ActionResult }) {
  return state.message ? (
    <p role="status" className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
      {state.message}
    </p>
  ) : null;
}
export type KeywordFormData = {
  id: string;
  keyword: string;
  targetPath: string;
  cluster: string;
  priority: string;
  country: string;
  device: string;
  targetRank: number;
};
export function KeywordForm({ keyword }: { keyword?: KeywordFormData }) {
  const [state, action, pending] = useActionState(saveKeyword, initial);
  return (
    <form action={action} className="space-y-3">
      {keyword && <input type="hidden" name="id" value={keyword.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          คำค้นหา
          <input
            className={input}
            name="keyword"
            required
            maxLength={160}
            defaultValue={keyword?.keyword}
            readOnly={!!keyword}
          />
        </label>
        <label className="text-sm">
          หน้าที่ต้องการให้ติดอันดับ
          <input
            className={input}
            name="targetPath"
            required
            placeholder="/products/"
            defaultValue={keyword?.targetPath}
          />
        </label>
        <label className="text-sm">
          กลุ่มคำ
          <input
            className={input}
            name="cluster"
            required
            maxLength={60}
            defaultValue={keyword?.cluster ?? "ทั่วไป"}
          />
        </label>
        <label className="text-sm">
          ความสำคัญ
          <select className={input} name="priority" defaultValue={keyword?.priority ?? "P1"}>
            <option value="P1">P1 · ทำก่อน</option>
            <option value="P2">P2 · ทำต่อ</option>
            <option value="monitor">เฝ้าติดตาม</option>
          </select>
        </label>
        <label className="text-sm">
          ประเทศ (ISO 3 ตัว)
          <input
            className={input}
            name="country"
            defaultValue={keyword?.country ?? "tha"}
            required
            pattern="[a-zA-Z]{3}"
            readOnly={!!keyword}
          />
        </label>
        <label className="text-sm">
          อุปกรณ์
          {keyword ? (
            <input className={input} name="device" value={keyword.device} readOnly />
          ) : (
            <select className={input} name="device" defaultValue="MOBILE">
              <option>MOBILE</option>
              <option>DESKTOP</option>
              <option>TABLET</option>
            </select>
          )}
        </label>
        <label className="text-sm">
          อันดับเป้าหมาย
          <input
            className={input}
            name="targetRank"
            type="number"
            min={1}
            max={100}
            defaultValue={keyword?.targetRank ?? 10}
            required
          />
        </label>
      </div>
      {keyword && (
        <p className="text-xs text-slate-500">
          ประวัติผูกกับคำค้นหา ประเทศ และอุปกรณ์ หากเปลี่ยน 3 ช่องนี้ให้เพิ่มคำใหม่
        </p>
      )}
      <button className={button} disabled={pending}>
        {pending ? "กำลังบันทึก…" : keyword ? "บันทึกเป้าหมาย" : "เพิ่มคำค้นหา"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
export function SeedForm() {
  const [state, action, pending] = useActionState(seedKeywords, initial);
  return (
    <form action={action}>
      <button className={button} disabled={pending}>
        {pending ? "กำลังเพิ่ม…" : "เพิ่มชุดเริ่มต้น 22 คำ"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
export function ToggleForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState(toggleKeyword, initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!active)} />
      <button className="text-sm font-medium text-slate-600 underline disabled:opacity-50" disabled={pending}>
        {active ? "พักการติดตาม" : "เปิดติดตามอีกครั้ง"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
function PeriodFields({ start, end }: { start: string; end: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">
        ตั้งแต่
        <input className={input} type="date" name="start" defaultValue={start} required />
      </label>
      <label className="text-sm">
        ถึง
        <input className={input} type="date" name="end" defaultValue={end} required />
      </label>
    </div>
  );
}
export function SyncForm({ start, end, configured }: { start: string; end: string; configured: boolean }) {
  const [state, action, pending] = useActionState(syncKeywords, initial);
  return (
    <form action={action} className="space-y-3">
      <PeriodFields start={start} end={end} />
      <p className="text-xs leading-5 text-slate-500">
        ดึงเฉพาะข้อมูลที่ Google สรุปแล้ว วันที่อิงเวลา Pacific ของ Search Console เลือกค่าเริ่มต้นย้อนหลัง 3
        วันเพื่อลดช่วงที่ข้อมูลยังไม่ครบ
      </p>
      <button className={button} disabled={pending || !configured}>
        {pending ? "กำลังดึงข้อมูล…" : "ดึงผลจาก Google"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
export function ImportForm({ start, end }: { start: string; end: string }) {
  const [state, action, pending] = useActionState(importCsv, initial);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm leading-6 text-slate-600">
        ส่งออกแท็บ Queries ของ Search Console เป็น CSV ช่วงเวลาเดียว เลือกประเภท Web
        และกรองประเทศ/อุปกรณ์ก่อนส่งออก โดยไม่กรองหน้า URL ระบบจับคู่เฉพาะคำที่เปิดติดตาม
      </p>
      <PeriodFields start={start} end={end} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          ประเทศ
          <input name="country" className={input} defaultValue="tha" pattern="[a-zA-Z]{3}" required />
        </label>
        <label className="text-sm">
          อุปกรณ์
          <select name="device" className={input}>
            <option>MOBILE</option>
            <option>DESKTOP</option>
            <option>TABLET</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">
        ไฟล์ Queries.csv (ไม่เกิน 500 KB)
        <input className={input} type="file" name="file" accept=".csv,text/csv" required />
      </label>
      <label className="flex items-start gap-2 text-sm leading-6">
        <input className="mt-1.5" type="checkbox" name="confirmed" required />
        วันที่ ประเทศ อุปกรณ์ และประเภท Web ตรงกับตัวกรองตอนส่งออกไฟล์นี้
      </label>
      <p className="text-xs text-slate-500">
        นำเข้าช่วงเดิมซ้ำจะอัปเดตค่าของแหล่ง CSV ไม่บวกซ้ำ และไม่ทับข้อมูล API
      </p>
      <button className={button} disabled={pending}>
        {pending ? "กำลังนำเข้า…" : "นำเข้าผลวัด"}
      </button>
      <Feedback state={state} />
      {state.ok && (
        <a className="block text-sm text-primary underline" href="/backoffice/seo/?source=GSC_CSV">
          ดูผลที่นำเข้าจาก CSV →
        </a>
      )}
    </form>
  );
}
