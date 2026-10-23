import "server-only";
import prisma from "@/lib/seo/prisma";
import { AskAnswerFaqStatus } from "@prisma/client";
import { translateAskAnswerFaqs } from "./translate-ask-answer-faqs.helper";
import type { SeoArticleJobRunner } from "../../seo-article/server/seo-article-job-runner.type";

/**
 * @description แปลข้อถาม-ตอบจาก AI ที่ยังไม่มีฉบับ EN แล้วเก็บลง questionEn/answerEn
 * @logic lg-jame ยังไม่มีหน้า /en — เก็บคำแปลไว้ในฐานข้อมูลเผื่อเปิดหน้าภาษาอังกฤษภายหลัง
 */
export const runTranslateFaqEnJob: SeoArticleJobRunner = async () => {
  const rows = await prisma.askAnswerFaq.findMany({
    where: { status: { not: AskAnswerFaqStatus.REJECTED }, OR: [{ questionEn: null }, { answerEn: null }] },
    orderBy: { createdAt: "asc" },
    select: { askAnswerFaqId: true, question: true, answer: true },
  });
  if (rows.length === 0) return { title: "ทุกข้อมีฉบับ EN แล้ว" };

  const translated = await translateAskAnswerFaqs(rows.map((row) => ({ question: row.question, answer: row.answer })));
  await prisma.$transaction(
    rows.flatMap((row, index) => {
      const item = translated[index];
      return item
        ? [
            prisma.askAnswerFaq.update({
              where: { askAnswerFaqId: row.askAnswerFaqId },
              data: { questionEn: item.question, answerEn: item.answer },
            }),
          ]
        : [];
    })
  );
  return { title: `แปลถาม-ตอบเป็น EN ${rows.length} ข้อ` };
};
