import { formatPublicCountClaim } from "./format-public-count-claim.helper";
import type { AskAnswerGrounding } from "../type/ask-answer-grounding.type";

const PUBLIC_COUNT_PATTERN =
  /(?:มากกว่า|อย่างน้อย)?\s*[0-9๐-๙][0-9๐-๙,]*(?:\.[0-9๐-๙]+)?\+?\s*(?:ชิ้นงาน|ชิ้น|คิว|ราย|งาน|ครั้ง)/g;
const BRAND_NAME = "LG Subscribe";
const FIRST_PERSON_PATTERN = /(?:ของเรา|ทีมเรา|เรา)/;
const CONTEXT_TOKEN_EXCLUSIONS = new Set(["เครื่อง", "บริการ", "รุ่น", "เครื่องใช้ไฟฟ้า"]);

/**
 * @description ตรวจคำตอบ FAQ ก่อนบันทึกว่าไม่มีจำนวนละเอียดหรือสรรพนามบุคคลที่ 1
 * @logic
 * - จำนวนที่ลงท้ายด้วยหน่วยงานสาธารณะต้องตรงกับ claim กว้างจาก grounding และหมวด/บริการในประโยคเดียวกัน
 * - ทั้งคำตอบต้องมีชื่อ LG Subscribe และห้ามใช้ เรา/ของเรา/ทีมเรา เพื่อคงเสียงบุคคลที่ 3
 * - ข้อความเชิงโฆษณาและภาพลักษณ์ปล่อยให้ AI เรียบเรียงได้ ไม่บังคับตรวจหลักฐานเชิงคุณภาพใน helper นี้
 * @param answer คำตอบสาธารณะที่ AI สร้าง
 * @param grounding ข้อมูลจริงที่ใช้สร้างคำตอบรอบเดียวกัน
 * @returns true เมื่อคำตอบผ่านข้อจำกัดที่ตรวจแบบ deterministic
 * @used-by {@link ../server/write-ask-answer-faqs.helper.ts}
 */
export const isPublicFaqAnswerGrounded = (answer: string, grounding: AskAnswerGrounding): boolean => {
  if (!answer.includes(BRAND_NAME) || FIRST_PERSON_PATTERN.test(answer)) return false;

  for (const match of answer.matchAll(PUBLIC_COUNT_PATTERN)) {
    const context = getSentenceAt(answer, match.index);
    if (!isPublicCountClaimAllowed(match[0], context, grounding)) return false;
  }

  return true;
};

/** ตรวจ claim กับแหล่งที่มา โดยห้ามนำยอดรวมไปผูกกับหมวดหรือบริการเฉพาะ */
const isPublicCountClaimAllowed = (claim: string, context: string, grounding: AskAnswerGrounding): boolean => {
  const normalizedClaim = normalizeClaim(claim);
  const matchingServices = grounding.categories
    .flatMap((category) => category.topServices)
    .map((service) => ({
      service,
      matchLength: Math.max(
        0,
        ...collectContextTokens(service.serviceName).map((token) => (context.includes(token) ? token.length : 0))
      ),
    }))
    .filter(({ matchLength }) => matchLength > 0);
  const longestServiceMatch = Math.max(0, ...matchingServices.map(({ matchLength }) => matchLength));
  const matchingCategories = grounding.categories.filter((category) =>
    collectContextTokens(category.categoryName).some((token) => context.includes(token))
  );
  const explicitlyAggregatedCategories = matchingCategories.filter((category) =>
    hasExplicitCategoryAggregateContext(context, category.categoryName)
  );

  const allowedClaims =
    longestServiceMatch > 0
      ? [
          ...matchingServices
            .filter(({ matchLength }) => matchLength === longestServiceMatch)
            .map(({ service }) => formatPublicCountClaim(service.orderCount, "ชิ้น")),
          ...explicitlyAggregatedCategories.map((category) => formatPublicCountClaim(category.serviceCount, "ชิ้นงาน")),
        ]
      : matchingCategories.length > 0
        ? matchingCategories.map((category) => formatPublicCountClaim(category.serviceCount, "ชิ้นงาน"))
        : [
            formatPublicCountClaim(grounding.completedOrderCount, "คิว"),
            formatPublicCountClaim(grounding.repeatCustomerCount, "ราย"),
            formatPublicCountClaim(grounding.activeCustomerCount, "ราย"),
          ];

  return allowedClaims.some(
    (allowedClaim) =>
      allowedClaim != null &&
      [normalizeClaim(allowedClaim), toPlusClaimAlias(allowedClaim)].filter(Boolean).includes(normalizedClaim)
  );
};

/** คืนข้อความเฉพาะประโยค/บรรทัดรอบ claim เพื่อใช้ตรวจการผูกยอดกับบริการ */
const getSentenceAt = (answer: string, index: number): string => {
  const start =
    Math.max(
      answer.lastIndexOf("\n", index),
      answer.lastIndexOf(".", index),
      answer.lastIndexOf("!", index),
      answer.lastIndexOf("?", index)
    ) + 1;
  const possibleEnds = [
    answer.indexOf("\n", index),
    answer.indexOf(".", index),
    answer.indexOf("!", index),
    answer.indexOf("?", index),
  ].filter((value) => value >= 0);
  const end = possibleEnds.length > 0 ? Math.min(...possibleEnds) : answer.length;
  return answer.slice(start, end);
};

/** สร้างคำบอกบริบทที่มีความหมายจากชื่อหมวดหรือชื่อบริการ */
const collectContextTokens = (label: string): string[] =>
  [label, ...label.split(/[\s/()_-]+/)]
    .map((token) => token.trim())
    .filter(
      (token, index, tokens) =>
        token.length >= 3 &&
        !/^\d+$/.test(token) &&
        !CONTEXT_TOKEN_EXCLUSIONS.has(token) &&
        tokens.indexOf(token) === index
    );

/** ตรวจว่าประโยคกำลังพูดถึงยอดรวมหมวดจริง ไม่ใช่เพียงระบุว่าบริการย่อยอยู่ในหมวดนั้น */
const hasExplicitCategoryAggregateContext = (context: string, categoryName: string): boolean => {
  const escapedCategoryName = categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:หมวด\\s*${escapedCategoryName}.{0,20}(?:ยอดรวม|รวมแล้ว|ทั้งหมด|โดยรวม)|(?:ยอดรวม|รวมแล้ว|ทั้งหมด|โดยรวม)(?:ของ)?หมวด\\s*${escapedCategoryName})`
  ).test(context);
};

/** จัดช่องว่างให้ claim ที่คัดลอกมาตรงกันแบบ deterministic */
const normalizeClaim = (claim: string): string => claim.trim().replace(/\s+/g, " ");

/** แปลง "มากกว่า 300 ชิ้น" เป็น alias "300+ ชิ้น" ตามภาษาการตลาดที่ผู้ใช้อนุญาต */
const toPlusClaimAlias = (claim: string): string | null => {
  const match = normalizeClaim(claim).match(/^มากกว่า ([\d,]+) (.+)$/);
  return match ? `${match[1]}+ ${match[2]}` : null;
};
