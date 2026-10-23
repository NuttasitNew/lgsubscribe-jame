/**
 * @description "แฟ้มข้อมูลจริง" ของทั้งธุรกิจที่ส่งเข้า AI ตอนคิดข้อถาม-ตอบใหม่ให้หน้า /ask-and-answer
 * @page /super-admin/hurry-web/seo-article?section=faq
 * @logic
 * - ต่างจาก {@link ../../seo-article/type/category-grounding.type.ts} ตรงที่ **ไม่ผูกกับหมวดบริการเดียว**
 *   หน้า ถาม-ตอบ เป็นหน้ารวมของทั้งเว็บ คำถามจึงข้ามหมวดได้ และต้องเห็นภาพรวมทั้งธุรกิจ
 * - ทุก field ในนี้คือ "ของที่พิสูจน์ได้" — คำอวดอ้างบนหน้าเว็บทุกประโยคต้องหยิบตัวเลขจากที่นี่
 *   ไม่มีข้อมูลรองรับ = ห้าม AI พูด (กติกาอยู่ใน build-ask-answer-grounding-message.helper.ts)
 * @related
 * - ผู้สร้าง: {@link ../server/build-ask-answer-grounding.helper.ts}
 * - ผู้ใช้: {@link ../server/write-ask-answer-faqs.helper.ts}
 */
export interface AskAnswerGrounding {
  /** งานที่ทำเสร็จจริงในรอบ 12 เดือน (นับเป็นคิว) — ตัวเลขหลักของ "ลูกค้าเลือกเราเยอะแค่ไหน" */
  completedOrderCount: number;
  /** จำนวนลูกค้าที่กลับมาใช้ซ้ำในรอบ 12 เดือน (มีตั้งแต่ 2 คิวขึ้นไป) — หลักฐานความพอใจที่แข็งกว่าคำโฆษณา */
  repeatCustomerCount: number;
  /** จำนวนลูกค้าทั้งหมดที่ใช้บริการในรอบ 12 เดือน — ตัวหารของอัตราใช้ซ้ำ */
  activeCustomerCount: number;
  /** สรุปต่อหมวดบริการ — ใช้ตอบ "เก่งด้านไหน" แยกเป็นด้าน ๆ ตามที่เจ้าของสั่ง */
  categories: {
    categoryCode: string;
    categoryName: string;
    /** จำนวนชิ้นงานในหมวดนี้ 12 เดือน */
    serviceCount: number;
    /** ช่วงราคาป้ายจริง — null = หมวดราคาเหมา ห้ามพูดถึงราคา */
    priceRange: { min: number; max: number } | null;
    /** บริการที่จ้างบ่อยสุดในหมวด (สูงสุด 5 รายการ) */
    topServices: { serviceName: string; orderCount: number }[];
  }[];
  /** เขตที่ไปทำงานบ่อยที่สุดทั้งเว็บ — ยกเป็นตัวอย่างได้ แต่ขอบเขตจริง = กรุงเทพฯ + ปริมณฑล */
  topDistricts: string[];
  /** คะแนน/จำนวนรีวิว Google ตามที่แสดงบนเว็บจริง — null = อ่านไฟล์ไม่ได้ ห้ามอ้างตัวเลขรีวิว */
  googleReview: { rating: string; reviewCountLabel: string } | null;
  /** บทความ SEO ที่เผยแพร่แล้ว — คำตอบลิงก์ไปหาได้ (internal link + ตอบต่อได้ลึก) */
  publishedArticles: { title: string; slug: string; targetKeyword: string | null }[];
  /** คำค้นจริงจาก Google Ads 90 วัน ที่ยังไม่มีบทความไหนจับ — คำถามที่ตอบคำเหล่านี้ได้คือคำถามที่คุ้ม */
  adKeywords: { keyword: string; clicks: number; costBaht: number }[];
  /** คำที่เว็บติดอันดับ 8-30 อยู่แล้ว — เติม FAQ อีกนิดก็ขึ้นหน้าแรกได้ */
  nearMissQueries: { query: string; impressions: number; position: number }[];
  /** คำถามที่อยู่บนหน้าเว็บจริงตอนนี้ — ห้ามเสนอซ้ำ */
  liveQuestions: string[];
  /** id ของข้อที่อยู่บนหน้าเว็บจริงตอนนี้ — ใช้กัน id ใหม่ชนของเดิม (ข้อเดิมไม่ได้อยู่ในฐาน) */
  liveFaqKeys: string[];
  /** คำถามที่ระบบเคยเสนอไปแล้ว (รวมที่ปัดตก) — ห้ามเสนอซ้ำ */
  proposedQuestions: string[];
}
