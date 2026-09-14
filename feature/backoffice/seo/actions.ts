"use server";

import { revalidatePath } from "next/cache";
import { requireBackofficeAccess } from "@/feature/backoffice/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { parseKeyword, parsePeriod, SeoInputError } from "./validation";
import { initialKeywords } from "./seed";
import { parseGscCsv } from "./csv";
import { syncSearchConsole } from "./sync";

export type ActionResult = { ok: boolean; message: string };
const finish = (message: string): ActionResult => {
  revalidatePath("/backoffice/seo");
  return { ok: true, message };
};
function failure(error: unknown): ActionResult {
  if (error instanceof SeoInputError) return { ok: false, message: error.message };
  if (typeof error === "object" && error && "code" in error && error.code === "P2002")
    return { ok: false, message: "มีคำค้นหานี้ในประเทศและอุปกรณ์เดียวกันแล้ว" };
  return { ok: false, message: "บันทึกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อฐานข้อมูลแล้วลองใหม่" };
}
export async function saveKeyword(_state: ActionResult, form: FormData): Promise<ActionResult> {
  await requireBackofficeAccess();
  try {
    const data = parseKeyword(Object.fromEntries(form));
    const id = String(form.get("id") ?? "");
    if (id) {
      // Changing query/country/device would relabel historical metrics. Create a
      // separate tracker for those changes; allow target and priority edits only.
      const existing = await getPrisma().seoKeyword.findUnique({ where: { id } });
      if (
        !existing ||
        existing.normalized !== data.normalized ||
        existing.country !== data.country ||
        existing.device !== data.device
      )
        throw new SeoInputError("คำค้นหา ประเทศ และอุปกรณ์เป็นตัวระบุประวัติ หากเปลี่ยนให้เพิ่มคำใหม่");
      await getPrisma().seoKeyword.update({
        where: { id },
        data: {
          targetPath: data.targetPath,
          cluster: data.cluster,
          priority: data.priority,
          targetRank: data.targetRank,
        },
      });
    } else await getPrisma().seoKeyword.create({ data });
    return finish(id ? "แก้ไขเป้าหมายแล้ว" : "เพิ่มคำค้นหาแล้ว");
  } catch (error) {
    return failure(error);
  }
}
export async function seedKeywords(): Promise<ActionResult> {
  await requireBackofficeAccess();
  try {
    const data = initialKeywords.flatMap((group) =>
      group.terms.map((keyword) =>
        parseKeyword({
          keyword,
          cluster: group.cluster,
          targetPath: group.targetPath,
          priority: group.cluster === "แบรนด์" ? "monitor" : "P1",
        }),
      ),
    );
    const result = await getPrisma().seoKeyword.createMany({ data, skipDuplicates: true });
    return finish(`เพิ่ม ${result.count} คำ (ข้ามคำที่มีอยู่แล้ว)`);
  } catch (error) {
    return failure(error);
  }
}
export async function toggleKeyword(_state: ActionResult, form: FormData): Promise<ActionResult> {
  await requireBackofficeAccess();
  try {
    const id = String(form.get("id") ?? "");
    await getPrisma().seoKeyword.update({ where: { id }, data: { active: form.get("active") === "true" } });
    return finish("เปลี่ยนสถานะติดตามแล้ว ประวัติเดิมยังอยู่");
  } catch (error) {
    return failure(error);
  }
}
export async function importCsv(_state: ActionResult, form: FormData): Promise<ActionResult> {
  await requireBackofficeAccess();
  try {
    const period = parsePeriod(String(form.get("start")), String(form.get("end")));
    const segment = parseKeyword({
      keyword: "validation",
      targetPath: "/",
      country: form.get("country"),
      device: form.get("device"),
    });
    if (form.get("confirmed") !== "on")
      throw new SeoInputError("ยืนยันว่าตัวกรองและวันที่ตรงกับไฟล์ก่อนนำเข้า");
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 500_000)
      throw new SeoInputError("เลือกไฟล์ CSV ขนาดไม่เกิน 500 KB");
    const rows = parseGscCsv(await file.text());
    const keywords = await getPrisma().seoKeyword.findMany({
      where: { country: segment.country, device: segment.device, active: true },
    });
    const lookup = new Map(keywords.map((k) => [k.normalized, k.id]));
    const matched = rows.filter((row) => lookup.has(row.normalized));
    if (!matched.length) throw new SeoInputError("ไม่มีคำในไฟล์ตรงกับคำที่เปิดติดตามในประเทศและอุปกรณ์นี้");
    // Missing rows stay unknown. A GSC export can hide queries or truncate rows.
    await getPrisma().$transaction([
      ...matched.map(({ normalized, ...metrics }) => {
        const keywordId = lookup.get(normalized)!;
        const data = {
          ...metrics,
          ...period,
          keywordId,
          source: "GSC_CSV",
          status: "MEASURED",
          observedPage: null,
        };
        return getPrisma().seoMeasurement.upsert({
          where: { keywordId_periodStart_periodEnd_source: { keywordId, ...period, source: "GSC_CSV" } },
          create: data,
          update: { ...data, measuredAt: new Date() },
        });
      }),
      getPrisma().seoSyncRun.create({
        data: {
          ...period,
          source: "GSC_CSV",
          status: "SUCCESS",
          processed: matched.length,
          message: `ข้าม ${rows.length - matched.length} แถวที่ไม่ได้ติดตาม`,
          finishedAt: new Date(),
        },
      }),
    ]);
    return finish(
      `นำเข้า ${matched.length} คำ ข้าม ${rows.length - matched.length} คำที่ไม่ได้ติดตาม (ไม่สร้างข้อมูลให้คำที่ไม่มีในไฟล์)`,
    );
  } catch (error) {
    return failure(error);
  }
}
export async function syncKeywords(_state: ActionResult, form: FormData): Promise<ActionResult> {
  await requireBackofficeAccess();
  try {
    const count = await syncSearchConsole(String(form.get("start")), String(form.get("end")));
    return finish(`ซิงก์แล้ว ${count} คำ`);
  } catch (error) {
    return failure(error);
  }
}
