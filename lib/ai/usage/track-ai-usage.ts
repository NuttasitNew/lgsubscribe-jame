import "server-only";

import { AiUsageFeature, AiUsageProvider } from "@prisma/client";

import { estimateAiCostUsd } from "@/lib/ai/billing/estimate-ai-cost";
import type { AiSpendProvider } from "@/lib/ai/billing/type/ai-spend-report.type";
import prisma from "@/lib/seo/prisma";

/** shape ของ usage ที่ AI SDK v6 คืนมา (`result.totalUsage` / `result.usage`) */
export interface AiSdkUsageLike {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedInputTokens?: number | null;
  reasoningTokens?: number | null;
  totalTokens?: number | null;
}

export interface TrackAiUsageParams {
  /** ฟีเจอร์ต้นทางที่เรียก LLM */
  feature: AiUsageFeature;
  /** "openai" | "anthropic" — รับ label แบบ `openai:gpt-...` ได้เช่นกัน (จะตัดหน้าให้) */
  provider: AiSpendProvider | string;
  /** model id — รับรูปแบบ `provider:modelId` ได้ (จะตัด prefix ให้) */
  model: string;
  /** usage จาก AI SDK — ใช้ `totalUsage` เมื่อเป็น agent หลาย step */
  usage?: AiSdkUsageLike | null;
  /** ชื่อ step ย่อย เช่น "retry" */
  operation?: string;
  /** `Date.now()` ตอนเริ่มเรียก — ใช้คำนวณ durationMs */
  startedAt?: number;
  success?: boolean;
  errorCode?: string;
  /** อ้างอิงงานต้นทาง เช่น `ORD:123` / userLineId / articleId */
  refId?: string;
  /** ชื่อผู้กดสั่ง (ถ้ามี) */
  actorName?: string;
  /** ค่าเครื่องมือที่คิดแยกจาก token (เช่น Claude web search $10 / 1,000 ครั้ง) — บวกเข้ายอดประมาณการ */
  toolFeeUsd?: number;
}

const toInt = (value: number | null | undefined): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** ตัด prefix `openai:` / `anthropic:` ออกจาก label ที่ call site ส่งมา */
const stripProviderPrefix = (value: string): string => {
  const idx = value.indexOf(":");
  return idx > 0 ? value.slice(idx + 1) : value;
};

const normalizeProvider = (value: string): AiSpendProvider => {
  const raw = (value || "").trim().toLowerCase();
  return raw.startsWith("anthropic") ? "anthropic" : "openai";
};

/**
 * @description บันทึกการเรียก LLM 1 ครั้งลง `AiUsageLog` (token + ค่าใช้จ่ายประมาณการ) แบบไม่ throw ออกไปรบกวน flow หลัก
 * @access server-only
 * @logic
 * - **นิยาม input token ต่างกันตาม provider** (ตามที่ AI SDK map มา):
 *   - openai: `inputTokens` = prompt tokens ทั้งหมด **รวม** ส่วนที่อ่านจาก cache → uncached = inputTokens − cachedInputTokens
 *   - anthropic: `inputTokens` = ส่วนที่ไม่ได้อ่านจาก cache อยู่แล้ว → uncached = inputTokens
 *   ถ้าไม่แยกตรงนี้ ฝั่ง OpenAI จะถูกคิดเงิน token ที่ cache แล้วซ้ำสองเด้ง
 * - cost มาจาก {@link estimateAiCostUsd} (price table hardcode) = ประมาณการ ไม่ใช่ยอดบิลจริง
 * - error ทุกชนิดถูกกลืนไว้ในนี้ — logging ห้ามทำให้ฟีเจอร์หลักพัง
 * @param params ฟีเจอร์ + provider/model + usage จาก AI SDK
 * @returns Promise ที่ resolve เสมอ (ไม่ reject) — call site เรียกแบบ `void trackAiUsage(...)` ได้
 * @used-by
 * - feature/social-chat/line/ai-suggest-reply/server/build-suggestion.ts
 * - lib/ai/office-assistant/build-office-command.ts
 * - feature/super-admin/hurry-web/seo-article/server/*.helper.ts
 * @related
 * - {@link ../billing/estimate-ai-cost.ts}
 * - schema: {@link ../../../prisma/schema/ai-usage-log.prisma}
 */
export const trackAiUsage = async (params: TrackAiUsageParams): Promise<void> => {
  try {
    const provider = normalizeProvider(params.provider);
    const model = stripProviderPrefix((params.model || "unknown").trim());

    const rawInput = toInt(params.usage?.inputTokens);
    const cachedInputTokens = toInt(params.usage?.cachedInputTokens);
    const outputTokens = toInt(params.usage?.outputTokens);
    const reasoningTokens = toInt(params.usage?.reasoningTokens);
    const inputTokens = provider === "openai" ? Math.max(0, rawInput - cachedInputTokens) : rawInput;

    const { costUsd } = estimateAiCostUsd({ provider, model, inputTokens, cachedInputTokens, outputTokens });

    await prisma.aiUsageLog.create({
      data: {
        provider: provider === "openai" ? AiUsageProvider.OPENAI : AiUsageProvider.ANTHROPIC,
        model,
        feature: params.feature,
        operation: params.operation ?? null,
        inputTokens,
        cachedInputTokens,
        outputTokens,
        reasoningTokens,
        estimatedCostUsd: costUsd + Math.max(0, params.toolFeeUsd ?? 0),
        durationMs: params.startedAt ? Math.max(0, Date.now() - params.startedAt) : null,
        success: params.success ?? true,
        errorCode: params.errorCode ?? null,
        refId: params.refId?.slice(0, 120) ?? null,
        actorName: params.actorName?.slice(0, 120) ?? null,
      },
    });
  } catch (error) {
    console.error("[AI-USAGE-01] trackAiUsage error:", error instanceof Error ? error.message : error);
  }
};
