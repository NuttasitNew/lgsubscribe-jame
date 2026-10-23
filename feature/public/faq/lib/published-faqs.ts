import "server-only";
import { AskAnswerFaqStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";

/**
 * FAQ entries the AI proposed and a backoffice user published (AskAnswerFaq, status PUBLISHED).
 * A database outage falls back to the fixed list only, so /faq never breaks.
 */
export async function listPublishedFaqs(): Promise<{ question: string; answer: string }[]> {
  try {
    return await getPrisma().askAnswerFaq.findMany({
      where: { status: AskAnswerFaqStatus.PUBLISHED },
      orderBy: { publishedAt: "asc" },
      select: { question: true, answer: true },
    });
  } catch (error) {
    console.error("faq: published entries unavailable", error instanceof Error ? error.message : error);
    return [];
  }
}
