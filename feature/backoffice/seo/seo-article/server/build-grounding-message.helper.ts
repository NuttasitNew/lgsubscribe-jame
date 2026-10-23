import "server-only";
import type { SeoCategoryGrounding } from "../type/category-grounding.type";

/** จำนวนบริการที่แจกแจงต่อระดับใน prompt — หมวดใหญ่มีเป็นร้อยรายการ ใส่หมดจะบวม */
const MAX_SERVICES_PER_TIER = 20;

/**
 * @description แปลงแฟ้มข้อมูลจริงเป็นข้อความสำหรับ prompt — แยกออกมาเพื่อให้ทั้งขั้นเสนอหัวข้อและขั้นเขียนใช้ร่วมกัน
 * @logic
 * - ตัดหัวข้อที่ไม่มีข้อมูลออกทั้งบล็อก ไม่ใส่บรรทัดว่างให้ AI เดา (เช่น dev ที่ยังไม่ sync GSC)
 * - ราคาส่งเป็นช่วง min-max ของราคาป้ายจริง — หมวดที่เป็นราคาเหมาล้วนจะไม่มีบรรทัดนี้เลย
 *   AI จึงไม่มีทางแต่งราคาขึ้นมาเองได้ในหมวดนั้น
 * @param grounding แฟ้มข้อมูลจริงของหมวด
 * @returns ข้อความ prompt ภาษาไทย
 * @used-by {@link ./suggest-category-topics.helper.ts}, {@link ./write-seo-article.helper.ts}
 */
export const buildGroundingMessage = (grounding: SeoCategoryGrounding): string => {
  const subcategoryNames = grounding.subcategoryNames ?? [];
  const scope =
    subcategoryNames.length > 0
      ? `รุ่น "${subcategoryNames.join(", ")}" ในหมวด "${grounding.categoryName}"`
      : `หมวดสินค้า "${grounding.categoryName}"`;
  const parts: string[] = [`ข้อมูลจริงของ${scope} ในแคตตาล็อก LG Subscribe (รหัส ${grounding.categoryCode}):`];

  if (subcategoryNames.length > 0) {
    parts.push(
      `\n[ขอบเขตบังคับของบทความ]\nเขียนเฉพาะรุ่นที่เลือก (${subcategoryNames.join(", ")}) เท่านั้น ` +
        `ห้ามดึงรุ่นอื่นในหมวด ${grounding.categoryName} มาปนเพื่อทำหัวข้อให้กว้างขึ้น`
    );
  }

  if (grounding.serviceDemand.length > 0) {
    const lines = grounding.serviceDemand
      .slice(0, MAX_SERVICES_PER_TIER * 2)
      .map((product) => {
        const price =
          product.servicePrice != null
            ? ` — เช่าเริ่มต้น ${product.servicePrice.toLocaleString()} บาท/เดือน`
            : " — ยังไม่มีราคาเริ่มต้นที่ยืนยันได้ (ห้ามพูดถึงราคาของรุ่นนี้)";
        const highTicket = product.isHighTicket ? " [รุ่นราคาสูงของหมวด]" : "";
        return `- ${product.serviceName}${price}${highTicket}`;
      })
      .join("\n");
    parts.push(`\n[รุ่นที่ให้เช่าจริงในแคตตาล็อก]\n${lines}`);
  } else if (grounding.serviceNames.length > 0) {
    parts.push(`\n[รุ่นที่ให้เช่าจริงในแคตตาล็อก]\n${grounding.serviceNames.join(", ")}`);
  }

  if (grounding.priceRange) {
    parts.push(
      `\n[ช่วงราคาเช่าเริ่มต้นต่อเดือนในขอบเขตนี้]\n${grounding.priceRange.min.toLocaleString()}-${grounding.priceRange.max.toLocaleString()} บาท/เดือน ` +
        `(ราคา ระยะสัญญา และโปรโมชันเป็นไปตามเงื่อนไขของ LG ณ วันที่สมัคร)`
    );
  }

  if (grounding.productGuide) {
    const guide = grounding.productGuide;
    parts.push(
      `\n[ความรู้สินค้าของหมวดนี้ — ใช้เป็นข้อเท็จจริงหลัก]\nสรุป: ${guide.summary}` +
        (guide.highlights.length > 0 ? `\nจุดเด่น:\n${guide.highlights.map((item) => `- ${item}`).join("\n")}` : "") +
        (guide.selectionCriteria.length > 0
          ? `\nวิธีเลือก:\n${guide.selectionCriteria.map((item) => `- ${item}`).join("\n")}`
          : "") +
        (guide.installation.length > 0
          ? `\nการติดตั้ง:\n${guide.installation.map((item) => `- ${item}`).join("\n")}`
          : "") +
        (guide.care ? `\nการดูแล: ${guide.care}` : "")
    );
  }

  const plannerIdeas = grounding.plannerIdeas ?? [];
  parts.push(
    plannerIdeas.length > 0
      ? `\n[Keyword Planner: ยอดค้นหาเฉลี่ยต่อเดือนโดยประมาณในประเทศไทย]\n${plannerIdeas.map((row) => `- "${row.keyword}" — ประมาณ ${row.avgMonthlySearches} ครั้ง/เดือน; การแข่งขันโฆษณา ${row.competition}; ดึงเมื่อ ${row.syncedAt.slice(0, 10)}`).join("\n")}\nเป็นค่าประมาณ ไม่ใช่จำนวนคน และการแข่งขันโฆษณาไม่ใช่ความยาก SEO ห้ามนำตัวเลขภายในนี้ไปเผยแพร่ในบทความ`
      : "\n[Keyword Planner] ยังไม่มีข้อมูลใหม่ภายใน 60 วัน ห้ามแต่งยอดค้นหาหรือสรุปว่าไม่มีคนค้น"
  );
  if (grounding.searchDemand.length > 0) {
    const lines = grounding.searchDemand
      .map(
        (row) =>
          `- "${row.keyword}" — organic 28 วัน ${row.impressions} impressions; Ads 90 วัน ${row.adImpressions ?? 0} impressions; ${row.organicPosition != null ? `อันดับเฉลี่ย ${row.organicPosition}` : "ไม่พบอันดับในข้อมูลที่เก็บ"}${row.hasArticle ? "; มีบทความจับแล้ว ควรปรับเรื่องเดิม" : ""}`
      )
      .join("\n");
    parts.push(
      `\n[การแสดงผลของเว็บเรา แยกแหล่งและช่วงเวลา]\n${lines}\nห้ามบวกข้ามแหล่งหรือเรียกตัวเลขนี้ว่ายอดค้นหาทั้งตลาด`
    );
  }

  if (grounding.adKeywords.length > 0) {
    const lines = grounding.adKeywords
      .map((k) => `- "${k.keyword}" — ${k.clicks} คลิก, จ่ายค่าโฆษณาไป ${k.costBaht.toLocaleString()} บาท`)
      .join("\n");
    parts.push(
      `\n[คำค้นจริงจาก Google Ads 90 วัน ที่ยังไม่มีบทความไหนจับ]\n` +
        `(เป็นคำของทั้งเว็บ ไม่ได้แยกหมวดมาให้ — คุณต้องเลือกเองว่าคำไหนเกี่ยวกับหมวดนี้)\n${lines}`
    );
  }

  if (grounding.nearMissQueries.length > 0) {
    const lines = grounding.nearMissQueries
      .map((q) => `- "${q.query}" — อันดับเฉลี่ย ${q.position}, แสดงผล ${q.impressions} ครั้ง`)
      .join("\n");
    parts.push(`\n[คำที่เว็บเราติดอันดับ 8-30 อยู่แล้ว ดันอีกนิดขึ้นหน้าแรกได้]\n${lines}`);
  }

  if (grounding.topDistricts.length > 0) {
    parts.push(
      `\n[เขตที่เราไปทำงานหมวดนี้บ่อยที่สุด]\n${grounding.topDistricts.join(", ")}\n` +
        `(ยกเป็นตัวอย่างได้ แต่พื้นที่ให้บริการจริงคือกรุงเทพฯ และปริมณฑลทั้งหมด ห้ามเขียนให้เข้าใจว่ารับเฉพาะเขตเหล่านี้)`
    );
  }

  if (grounding.existingTitles.length > 0) {
    parts.push(`\n[บทความที่มีอยู่แล้ว ห้ามเสนอ/เขียนซ้ำหรือใกล้เคียง]\n${grounding.existingTitles.join("\n")}`);
  }

  return parts.join("\n");
};
