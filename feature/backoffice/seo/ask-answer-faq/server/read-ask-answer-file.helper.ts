import "server-only";
import { AskAnswerFaqStatus } from "@prisma/client";
import prisma from "@/lib/seo/prisma";
import { faqs as staticFaqs } from "@/lib/site";
import type { AskAnswerFile } from "../type/ask-answer-file.type";

/**
 * @description รายการถาม-ตอบที่อยู่บนหน้า /faq ของ lg-jame ตอนนี้ = ข้อตายตัวใน lib/site.ts + ข้อจาก AI ที่เผยแพร่แล้ว
 * @logic
 * - hmp-frontend อ่านไฟล์ json จาก repo อื่น; lg-jame ประกอบจากโค้ด + ฐานข้อมูลแทน จึงไม่มี sha
 * - lg-jame ไม่มีหน้า /en — locale "en" คืนฉบับ EN ของข้อจาก AI (ข้อตายตัวไม่มีคำแปล)
 * @used-by {@link ./build-ask-answer-grounding.helper.ts}, {@link ./publish-ask-answer-faqs.action.ts}
 */
export const readAskAnswerFile = async (locale: "th" | "en"): Promise<{ data: AskAnswerFile; sha: string }> => {
  const published = await prisma.askAnswerFaq.findMany({
    where: { status: AskAnswerFaqStatus.PUBLISHED },
    orderBy: { publishedAt: "asc" },
    select: { faqKey: true, question: true, answer: true, questionEn: true, answerEn: true },
  });
  const fixed = locale === "th" ? staticFaqs.map((faq, index) => ({ id: `site-${index + 1}`, ...faq })) : [];
  return {
    sha: "",
    data: {
      headerLabel: "คำถามที่พบบ่อย",
      imageUrl: "",
      faqs: [
        ...fixed,
        ...published.map((row) => ({
          id: row.faqKey,
          question: locale === "en" ? row.questionEn?.trim() || row.question : row.question,
          answer: locale === "en" ? row.answerEn?.trim() || row.answer : row.answer,
        })),
      ],
    },
  };
};
