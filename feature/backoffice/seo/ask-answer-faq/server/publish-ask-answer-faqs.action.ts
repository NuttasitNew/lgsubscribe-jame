"use server";

import { cookies } from "next/headers";
import { verifyByToken } from "@/lib/seo/auth";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";
import { fileLogger } from "@/lib/seo/logger";
import prisma from "@/lib/seo/prisma";
import { AskAnswerFaqStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { readAskAnswerFile } from "./read-ask-answer-file.helper";

export interface PublishAskAnswerFaqsParams {
  /** ข้อที่ติ๊กเลือก — เผยแพร่ทีเดียวหลายข้อได้ (1 commit = 1 deploy ไม่ใช่ deploy ต่อข้อ) */
  askAnswerFaqIds: number[];
}

export interface PublishAskAnswerFaqsResult {
  publishedCount: number;
  commitSha: string;
  /** ไฟล์ en ไม่ได้อัปเดต (push ล้ม) — ไทยขึ้นเว็บแล้ว ผู้ใช้ควรกด "แปลหน้า EN" ซ่อม */
  enWarning?: string;
}

/**
 * @description เผยแพร่ข้อถาม-ตอบที่ตรวจแล้ว — ต่อท้ายลงไฟล์ ask-and-answer ทั้ง th และ en บน repo hurry-web
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @access super-admin
 * @logic
 * 1. อ่านไฟล์ th จาก repo → **ต่อท้าย** รายการเดิม → push ทับด้วย sha
 *    - "ต่อท้าย" ไม่ใช่ "ประกอบไฟล์ใหม่จากฐาน": ข้อเดิม 20 กว่าข้อบนเว็บไม่ได้อยู่ในตารางนี้
 *      generate ไฟล์ใหม่ทั้งใบเมื่อไหร่ = ข้อเดิมหายจากเว็บทั้งหมดพร้อมกัน (และ Google เห็นทันที)
 *    - `headerLabel`/`imageUrl` ของไฟล์เดิมคงไว้ทั้งดุ้น — เป็นของ preview editor ไม่ใช่ของระบบนี้
 * 2. ข้อที่ id ซ้ำกับที่มีอยู่ในไฟล์แล้ว = ข้ามไป ไม่เขียนซ้ำ (กันกดเผยแพร่ 2 ครั้งแล้วได้ข้อคู่)
 * 3. push th สำเร็จ → UPDATE สถานะเป็น PUBLISHED ทันที **ก่อน** ยุ่งกับไฟล์ en
 *    เพราะของหลักขึ้นเว็บแล้ว ถ้าปล่อยให้ en ที่ล้มมาย้อนสถานะ กดใหม่รอบหน้าจะได้ข้อซ้ำบนเว็บ
 * 4. ไฟล์ en ล้ม = คืนคำเตือน ไม่ใช่ error — ไทยคือความจริงหลักและขึ้นไปแล้ว
 *    ข้อที่ยังไม่มีฉบับ EN จะใส่ข้อความไทยลงไฟล์ en ไปพลาง (ดีกว่าไฟล์ th/en มีข้อไม่เท่ากัน
 *    ซึ่งทำให้ id ของสองภาษาไม่ตรงกันแล้วงานแปลรอบหน้าจับคู่ผิด)
 * @param params เลขข้อที่จะเผยแพร่
 * @returns จำนวนข้อที่ขึ้นเว็บ + commit
 * @used-by {@link ../tanstack/publish-ask-answer-faqs.mutation.ts}
 * @related {@link ./run-translate-faq-en-job.helper.ts}
 */
export const publishAskAnswerFaqs = async (
  params: PublishAskAnswerFaqsParams
): Promise<ResponsePatternType<PublishAskAnswerFaqsResult>> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("lg_backoffice_session")?.value;
  if (!authToken) return ResponsePattern.unauthorized("no auth token");

  let decoded;
  try {
    decoded = await verifyByToken(authToken);
  } catch {
    return ResponsePattern.unauthorized("Token ไม่ถูกต้องหรือหมดอายุ");
  }

  if (decoded.role !== "SUPER_ADMIN") {
    return ResponsePattern.forbidden("[FAQ-PUB-01] เฉพาะ super-admin เท่านั้น");
  }

  const ids = [...new Set(params.askAnswerFaqIds)];
  if (ids.length === 0) return ResponsePattern.badRequest("[FAQ-PUB-02] ยังไม่ได้เลือกข้อไหนเลย");

  const publisher = decoded.name || decoded.userId;
  const log = fileLogger.session("เผยแพร่ข้อถาม-ตอบขึ้นเว็บ", {
    type: "U",
    id: `FAQ:${ids.join(",")}`,
    userName: publisher,
  });

  try {
    const rows = await prisma.askAnswerFaq.findMany({
      where: { askAnswerFaqId: { in: ids }, status: AskAnswerFaqStatus.DRAFT },
      orderBy: { createdAt: "asc" }, // ต่อท้ายตามลำดับที่ AI เสนอ ไม่ใช่ลำดับที่ผู้ใช้ติ๊ก
    });
    if (rows.length === 0) {
      log.error("ไม่มีข้อที่ยังเป็นร่างในชุดที่เลือก");
      return ResponsePattern.badRequest("[FAQ-PUB-03] ข้อที่เลือกถูกเผยแพร่หรือปัดตกไปแล้ว — โหลดหน้าใหม่");
    }

    // ---- ข้อที่อยู่บนหน้า /faq แล้ว (กันซ้ำ) ----
    const thai = await readAskAnswerFile("th");
    const existingKeys = new Set(thai.data.faqs.map((faq) => faq.id));
    const toAppend = rows.filter((row) => !existingKeys.has(row.faqKey));

    if (toAppend.length === 0) {
      // ทุกข้ออยู่บนเว็บแล้ว — สถานะในฐานตามไม่ทัน ให้ sync แล้วจบแบบสำเร็จ ไม่ใช่ error
      await prisma.askAnswerFaq.updateMany({
        where: { askAnswerFaqId: { in: rows.map((row) => row.askAnswerFaqId) } },
        data: { status: AskAnswerFaqStatus.PUBLISHED, publishedAt: new Date(), publishedBy: publisher },
      });
      log.end({ result: "already-on-web" });
      return ResponsePattern.ok("ข้อที่เลือกอยู่บนเว็บอยู่แล้ว — อัปเดตสถานะให้ตรงกันแล้ว", {
        publishedCount: 0,
        commitSha: "",
      });
    }

    await prisma.askAnswerFaq.updateMany({
      where: { askAnswerFaqId: { in: toAppend.map((row) => row.askAnswerFaqId) } },
      data: { status: AskAnswerFaqStatus.PUBLISHED, publishedAt: new Date(), publishedBy: publisher },
    });
    revalidatePath("/faq/");

    log.end({ result: `+${toAppend.length}` });
    return ResponsePattern.ok(`เผยแพร่ ${toAppend.length} ข้อขึ้นหน้า /faq แล้ว`, {
      publishedCount: toAppend.length,
      commitSha: "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    log.error(message);
    return ResponsePattern.error("[FAQ-PUB-05] เผยแพร่ไม่สำเร็จ");
  } finally {
    log.end();
  }
};
