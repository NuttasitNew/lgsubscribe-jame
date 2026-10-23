import "server-only";
import { formatPublicCountClaim } from "../helper/format-public-count-claim.helper";
import type { AskAnswerGrounding } from "../type/ask-answer-grounding.type";

/**
 * @description แปลงแฟ้มข้อมูลจริงของธุรกิจเป็นข้อความ prompt + กติกาการใช้ตัวเลข
 * @logic
 * - **กติกาการอ้างตัวเลขอยู่ติดกับข้อมูล ไม่ใช่ใน system prompt** (บทเรียนเดียวกับ GROUNDING_USAGE_RULES
 *   ฝั่งบทความ): ถ้ากติกาอยู่ไกลจากตัวเลข AI จะจำกติกาแต่ลืมว่าตัวเลขไหนมีจริง แล้วแต่งเลขใกล้เคียงขึ้นมา
 * - บล็อกไหนไม่มีข้อมูลจะถูกตัดทิ้งทั้งบล็อก — ไม่ใส่หัวข้อว่างให้ AI เดา
 *   เช่น dev ที่ยังไม่ sync GSC หรืออ่านไฟล์รีวิวบนเว็บไม่ได้ → prompt จะไม่มีคำว่า "รีวิว" เลย
 *   AI จึงไม่มีวัตถุดิบให้แต่งตัวเลขรีวิวขึ้นมาเอง
 * - จำนวนงาน/ลูกค้าใช้ซ้ำถูกปัดลงเป็น claim กว้างก่อนเข้า prompt เช่น 358 → "มากกว่า 300"
 *   เพื่อไม่ให้ FAQ สาธารณะเผยเลขหลังบ้านแบบเจาะจงเกินไป และยังไม่อ้างเกินข้อมูลจริง
 * - ราคา คะแนนรีวิว และข้อมูล Google Ads/GSC ยังเก็บตามแหล่งจริง แต่กติกากำกับว่าตัวเลข Ads/GSC ใช้เลือกหัวข้อ
 *   และเขียน reason เท่านั้น ห้ามนำไปอวดใน answer
 * @param grounding แฟ้มข้อมูลจริงของทั้งธุรกิจ
 * @returns ข้อความ prompt ภาษาไทย
 * @used-by {@link ./write-ask-answer-faqs.helper.ts}
 */
export const buildAskAnswerGroundingMessage = (grounding: AskAnswerGrounding): string => {
  const parts: string[] = [
    "ข้อมูลจริงของ LG Subscribe (บริการเช่ารายเดือนเครื่องใช้ไฟฟ้า LG — ข้อมูลรอบนี้ไม่มียอดออเดอร์ ยอดลูกค้า หรือคะแนนรีวิว ห้ามอ้างตัวเลขเหล่านี้):",
  ];

  if (grounding.completedOrderCount > 0) {
    const completedClaim = formatPublicCountClaim(grounding.completedOrderCount, "คิว");
    if (completedClaim) {
      parts.push(
        `\n[งานที่ทำเสร็จจริงในรอบ 12 เดือน]\n${completedClaim} ` +
          `(นับเฉพาะคิวที่ปิดงานแล้ว ไม่รวมงานที่ยกเลิกหรือรอยืนยัน)`
      );
    }
  }

  if (grounding.repeatCustomerCount > 0 && grounding.activeCustomerCount > 0) {
    const repeatClaim = formatPublicCountClaim(grounding.repeatCustomerCount, "ราย");
    const activeClaim = formatPublicCountClaim(grounding.activeCustomerCount, "ราย");
    if (repeatClaim && activeClaim) {
      parts.push(
        `\n[ลูกค้าที่กลับมาใช้ซ้ำในรอบ 12 เดือน]\n` +
          `${repeatClaim} กลับมาใช้ซ้ำ จากฐานลูกค้าที่ใช้บริการ ${activeClaim}\n` +
          `ห้ามคำนวณเปอร์เซ็นต์หรือสร้างจำนวนละเอียดขึ้นมาใหม่`
      );
    }
  }

  if (grounding.googleReview) {
    parts.push(
      `\n[คะแนนรีวิว Google ที่แสดงบนเว็บตอนนี้]\n` +
        `${grounding.googleReview.rating} — ${grounding.googleReview.reviewCountLabel}\n` +
        `อ้างได้ตรง ๆ เพราะผู้เข้าเว็บเห็นตัวเลขชุดนี้อยู่แล้วในหน้ารีวิว`
    );
  }

  if (grounding.categories.length > 0) {
    const lines = grounding.categories
      .map((category) => {
        const price = category.priceRange
          ? ` | เช่าเริ่มต้น ${category.priceRange.min.toLocaleString()} บาท/เดือน` +
            (category.priceRange.max !== category.priceRange.min
              ? ` (ถึง ${category.priceRange.max.toLocaleString()} บาท/เดือน)`
              : "")
          : "";
        const models = category.topServices.map((service) => service.serviceName).join(", ");
        const modelCount = category.serviceCount > 0 ? ` | ${category.serviceCount} รุ่น` : "";
        return `- ${category.categoryName}${modelCount}${price}${models ? `\n  รุ่นตัวอย่าง: ${models}` : ""}`;
      })
      .join("\n");
    parts.push(
      `\n[หมวดสินค้า LG ที่เปิดให้เช่า พร้อมรุ่นและราคาเช่าเริ่มต้นต่อเดือน]\n${lines}\n` +
        `ราคาที่ระบุคือราคาเช่ารายเดือนเริ่มต้นตามรุ่น ใช้ตอบเรื่องราคาได้เฉพาะตามนี้ ` +
        `ห้ามสร้างราคา รุ่น หรือสเปกที่ไม่อยู่ในรายการ`
    );
  }

  if (grounding.topDistricts.length > 0) {
    parts.push(`\n[พื้นที่ที่ยกเป็นตัวอย่างได้]\n${grounding.topDistricts.join(", ")}`);
  }

  if (grounding.publishedArticles.length > 0) {
    const lines = grounding.publishedArticles.map((article) => `- /blog/${article.slug} — ${article.title}`).join("\n");
    parts.push(
      `\n[บทความบนเว็บที่ลิงก์ไปได้]\n${lines}\n` +
        `ถ้าคำถามข้อไหนตรงกับบทความเรื่องใด ให้ใส่ slug ของบทความนั้นใน relatedSlug และเขียนคำตอบให้ชวนอ่านต่อ\n` +
        `**ห้ามแต่ง slug ที่ไม่มีในรายการนี้** — ลิงก์เสียบนหน้าที่ Google index แล้วเสียหายกว่าไม่มีลิงก์`
    );
  }

  if (grounding.adKeywords.length > 0) {
    const lines = grounding.adKeywords
      .map(
        (keyword) =>
          `- "${keyword.keyword}" — ${keyword.clicks} คลิก, จ่ายค่าโฆษณาไป ${keyword.costBaht.toLocaleString()} บาท`
      )
      .join("\n");
    parts.push(
      `\n[คำค้นที่ยังไม่มีบทความไหนจับ]\n${lines}\n` +
        `คำถามที่ตอบคำเหล่านี้ได้คือคำถามที่คุ้มที่สุด — ตัวเลขคลิก/ค่าโฆษณา (ถ้ามี) ใช้ได้เฉพาะ reason สำหรับคนตรวจ ` +
        `ห้ามนำไปใส่ใน answer สาธารณะ`
    );
  }

  if (grounding.nearMissQueries.length > 0) {
    const lines = grounding.nearMissQueries
      .map((query) => `- "${query.query}" — อันดับเฉลี่ย ${query.position}, แสดงผล ${query.impressions} ครั้ง`)
      .join("\n");
    parts.push(
      `\n[คำที่เว็บติดอันดับ 8-30 อยู่แล้ว ดันอีกนิดขึ้นหน้าแรกได้]\n${lines}\n` +
        `ตัวเลขอันดับ/impressions ใช้เลือกหัวข้อและเขียน reason เท่านั้น ห้ามใส่ใน answer สาธารณะ`
    );
  }

  const existing = [...grounding.liveQuestions, ...grounding.proposedQuestions];
  if (existing.length > 0) {
    parts.push(`\n[คำถามที่มีอยู่แล้ว/เคยเสนอไปแล้ว — ห้ามเสนอซ้ำหรือใกล้เคียง]\n${existing.join("\n")}`);
  } else {
    parts.push(`\n[คำถามที่มีอยู่แล้ว]\nอ่านรายการจากเว็บไม่ได้ในรอบนี้ — เสนอเฉพาะคำถามพื้นฐานที่มั่นใจว่ายังไม่มี`);
  }

  return parts.join("\n");
};
