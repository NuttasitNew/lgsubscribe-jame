import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText, type ModelMessage } from "ai";
import type { z } from "zod";
import { AiUsageFeature } from "@prisma/client";
import { trackAiUsage } from "@/lib/ai/usage/track-ai-usage";
import { getSeoArticleAi, type SeoAiTask } from "../../seo-article/server/seo-article-ai-model";

/** pause_turn = server tool วนนานจน API พักเทิร์น ต้องส่งต่อให้ทำต่อ — จำกัดรอบไว้กันค่าใช้จ่ายบาน */
const MAX_CONTINUATIONS = 3;
/** บันทึกสั้นกว่านี้ = AI ยังไม่ได้เขียนสรุป (มีแค่ประโยคเกริ่น) */
const MIN_NOTES_LENGTH = 800;
const WRAP_UP_PROMPT =
  "หยุดค้นเว็บแล้ว ไม่ต้องเปิดหน้าใดเพิ่ม เขียนบันทึกสรุปทุกข้อมูลที่อ่านเจอจากหน้าที่เปิดไปแล้วให้ครบตามโจทย์ " +
  "ทุกข้อเท็จจริง/ตัวเลขต้องกำกับ URL ของหน้าที่เห็นข้อมูลนั้นต่อท้าย ข้อไหนหาไม่เจอให้เขียนว่าไม่พบข้อมูล";

export interface WebResearchParams<T> {
  task: Extract<SeoAiTask, "researchKeywords" | "analyzeSerp" | "researchCompare">;
  feature: AiUsageFeature;
  system: string;
  prompt: string;
  /** รูปแบบผลลัพธ์สุดท้าย — แปลงจากบันทึกการค้นคว้าในขั้นที่สอง */
  schema: z.ZodType<T>;
  /** คำสั่งสำหรับขั้นแปลงบันทึกเป็นโครงข้อมูล (กติกาเฉพาะงาน) */
  structureInstruction: string;
  maxSearches?: number;
  maxFetches?: number;
}

export interface WebResearchResult<T> {
  object: T;
  /** บันทึกการค้นคว้าแบบข้อความ (มี URL ที่อ่านจริง) — เก็บไว้ตรวจย้อนหลัง */
  notes: string;
  /** URL ที่ web_search/web_fetch เจอจริง ใช้ตรวจว่า AI ไม่ได้แต่งแหล่งอ้างอิง */
  visitedUrls: string[];
  model: string;
}

/**
 * @description แกนร่วมของ AI ที่ต้อง "ออกไปดูเว็บจริง" (research keyword / อ่าน SERP / เก็บข้อมูลแบรนด์คู่เทียบ)
 * @access server-only
 * @logic
 * 1. ขั้นค้นคว้า: Claude Sonnet 5.5 + server tools `web_search_20260209` / `web_fetch_20260209`
 *    (dynamic filtering — Anthropic รันค้น/อ่านหน้าเว็บให้ฝั่งเซิร์ฟเวอร์ ไม่ต้องมี SERP API แยก)
 *    ผลค้นหาไม่ใช่หน้า Google ไทยตรง ๆ แต่ใกล้เคียงพอสำหรับดูว่าใครติดและเขียนอะไร (อันดับจริงวัดจาก Search Console)
 * 2. ถ้า API ตอบ `pause_turn` (ค้นนานจนพักเทิร์น) ส่ง messages เดิมกลับไปให้ทำต่อ สูงสุด {@link MAX_CONTINUATIONS} รอบ
 *    — AI SDK แปลง pause_turn เป็น "stop" ถ้าไม่เช็ค rawFinishReason จะได้บันทึกครึ่งเดียว
 *    ถ้าค้นจนหมดรอบ/โดนตัดโดยยังไม่ได้เขียนสรุป → ส่งอีกเทิร์นแบบปิดเครื่องมือ (toolChoice none) ให้สรุปจากที่อ่านแล้ว
 * 3. ขั้นจัดโครง: ให้ Claude รุ่นเดียวกันแปลงบันทึกเป็น JSON ตาม schema (แยกขั้นเพราะ structured output
 *    กับ server tool ที่วนหลายรอบรวมกันแล้วเสี่ยงได้ JSON ครึ่งเดียวตอน pause)
 * 4. คืน URL ที่ tool เจอจริง ให้ผู้เรียกกรองแหล่งอ้างอิงที่ AI อาจแต่งขึ้นทิ้ง
 * - เนื้อหาเว็บภายนอกเป็นข้อมูล ไม่ใช่คำสั่ง — system prompt ของทุกงานต้องย้ำเรื่องนี้
 */
export const runWebResearch = async <T>(params: WebResearchParams<T>): Promise<WebResearchResult<T>> => {
  const ai = getSeoArticleAi(params.task);
  if (ai.provider !== "anthropic") {
    throw new Error("[SEO-WEB-01] งานค้นเว็บต้องใช้ Claude (ตั้ง ANTHROPIC_API_KEY และอย่าตั้ง SEO_AI_PROVIDER=openai)");
  }

  const tools = {
    web_search: anthropic.tools.webSearch_20260209({
      // ไม่ตั้ง userLocation: web_search ของ Anthropic ไม่รองรับ country "TH" (ตอบ 400) — ใช้คำค้นภาษาไทยแทน
      maxUses: params.maxSearches ?? 8,
    }),
    web_fetch: anthropic.tools.webFetch_20260209({
      maxUses: params.maxFetches ?? 6,
      maxContentTokens: 12000,
    }),
  };

  const messages: ModelMessage[] = [{ role: "user", content: params.prompt }];
  const notes: string[] = [];
  const visited = new Set<string>();
  const startedAt = Date.now();
  let endedCleanly = false;

  for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
    const result = await generateText({
      model: ai.model,
      system: params.system,
      messages,
      tools,
      providerOptions: ai.providerOptions,
      maxOutputTokens: 16000,
    });
    void trackAiUsage({
      feature: params.feature,
      provider: ai.provider,
      model: ai.modelId,
      usage: result.totalUsage,
      startedAt,
      operation: `${params.task}:search`,
    });

    for (const step of result.steps) {
      for (const part of step.content) {
        if (part.type === "source" && part.sourceType === "url") visited.add(part.url);
        if (part.type === "tool-result") collectUrls(part.output, visited);
      }
    }
    if (result.text.trim()) notes.push(result.text.trim());
    messages.push(...result.response.messages);
    endedCleanly = result.rawFinishReason !== "pause_turn" && result.finishReason !== "length";
    if (result.rawFinishReason !== "pause_turn") break;
  }

  // ค้นจนหมดรอบ/โดนตัดก่อนเขียนสรุป (เจอบ่อยในงานเทียบแบรนด์ที่เปิดหลายหน้า) → สั่งให้สรุปจากที่อ่านแล้ว ห้ามค้นเพิ่ม
  if (!endedCleanly || notes.join("").length < MIN_NOTES_LENGTH) {
    const wrapUp = await generateText({
      model: ai.model,
      system: params.system,
      messages: [...messages, { role: "user", content: WRAP_UP_PROMPT }],
      tools,
      toolChoice: "none",
      providerOptions: ai.providerOptions,
      maxOutputTokens: 16000,
    });
    void trackAiUsage({
      feature: params.feature,
      provider: ai.provider,
      model: ai.modelId,
      usage: wrapUp.totalUsage,
      startedAt,
      operation: `${params.task}:wrap-up`,
    });
    if (wrapUp.text.trim()) notes.push(wrapUp.text.trim());
  }

  const notesText = notes.join("\n\n");
  if (!notesText) throw new Error("[SEO-WEB-02] AI ค้นเว็บแล้วไม่ได้สรุปอะไรกลับมา — ลองสั่งใหม่อีกครั้ง");

  const structureStartedAt = Date.now();
  const { object, usage } = await generateObject({
    model: ai.model,
    schema: params.schema,
    // งานคัดลอกข้อมูลลงโครง ไม่ต้องคิดลึก
    providerOptions: { anthropic: { effort: "low" } },
    system:
      "แปลงบันทึกการค้นคว้าเป็นข้อมูลตาม schema อย่างซื่อตรง ห้ามเติมข้อเท็จจริง ตัวเลข หรือ URL ที่ไม่มีในบันทึก " +
      "ถ้าบันทึกไม่มีข้อมูลช่องไหน ให้เว้นว่างหรือใช้ค่า null ตามที่ schema อนุญาต",
    messages: [
      {
        role: "user",
        content: `${params.structureInstruction}\n\nURL ที่เครื่องมือค้นเว็บเปิดจริง:\n${[...visited].join("\n") || "(ไม่มี)"}\n\nบันทึกการค้นคว้า:\n${notesText}`,
      },
    ],
  });
  void trackAiUsage({
    feature: params.feature,
    provider: ai.provider,
    model: ai.modelId,
    usage,
    startedAt: structureStartedAt,
    operation: `${params.task}:structure`,
  });

  return { object, notes: notesText, visitedUrls: [...visited], model: ai.modelId };
};

/** เก็บ URL จากผล web_search (array) / web_fetch (object มี url) แบบไม่ผูกกับ shape ภายในมากเกินไป */
const collectUrls = (output: unknown, into: Set<string>) => {
  if (Array.isArray(output)) {
    for (const item of output) collectUrls(item, into);
    return;
  }
  if (output && typeof output === "object") {
    const url = (output as { url?: unknown }).url;
    if (typeof url === "string" && /^https?:\/\//.test(url)) into.add(url);
    const value = (output as { value?: unknown }).value;
    if (value) collectUrls(value, into);
  }
};

/** เทียบ URL แบบไม่สนใจ / ท้าย, query และ www. — AI มักอ้าง URL ต่างจากที่ fetch นิดหน่อย */
export const normalizeUrlForMatch = (url: string): string => {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
};

/** URL นี้มาจากผลค้นเว็บจริงไหม (หรืออย่างน้อยอยู่โดเมนเดียวกับหน้าที่เปิดจริง) */
export const isVisitedUrl = (url: string | null | undefined, visitedUrls: string[]): boolean => {
  if (!url) return false;
  const target = normalizeUrlForMatch(url);
  return visitedUrls.some((visited) => normalizeUrlForMatch(visited) === target);
};
