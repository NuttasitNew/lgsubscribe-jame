/** หลักฐานประกอบคำค้น — คำนวณจากข้อมูลของเราเอง ไม่ใช่ตัวเลขที่ AI พิมพ์มา */
export interface SeoKeywordEvidence {
  inAutocomplete: boolean;
  plannerMonthlySearches: number | null;
  plannerCompetition: string | null;
  gscImpressions28d: number | null;
  gscAvgPosition28d: number | null;
  researchedAt: string;
  model: string;
}

/** บทความอันดับต้น ๆ ที่ AI อ่านแล้ว */
export interface SerpCompetitorPage {
  rank: number;
  url: string;
  title: string;
  covers: string[];
  weaknesses: string[];
}

/** ข้อเท็จจริงที่ต้องมีในบทความ พร้อมแหล่งที่ตรวจแล้ว */
export interface SerpVerifiedFact {
  fact: string;
  sourceUrl: string;
}

/** สไตล์การเขียนที่หน้าติดอันดับใช้ร่วมกัน — Google ให้รางวัลรูปแบบนี้กับ intent นี้ */
export interface SerpWritingStyle {
  /** น้ำเสียง/ระดับภาษา เช่น "กันเอง พูดกับผู้อ่านตรง ๆ" */
  tone: string;
  /** ลำดับเนื้อหาที่หน้าอันดับต้นใช้ซ้ำกัน */
  structure: string;
  /** องค์ประกอบที่เจอบ่อย เช่น ตารางเทียบ, กล่องสรุป, ข้อดี-ข้อเสีย, FAQ */
  formats: string[];
  /** รูปแบบชื่อบทความที่ติดอันดับ */
  titlePatterns: string[];
  /** ความยาว/ความลึกโดยประมาณ */
  depth: string;
  /** ควรทำตาม */
  adopt: string[];
  /** ควรทำให้ต่าง/เลี่ยง */
  avoid: string[];
}

/** ผลวิเคราะห์ SERP ของคำค้น 1 คำ — เก็บใน SeoKeyword.serpBrief */
export interface SerpBrief {
  kind: "serp";
  searchIntent: string;
  topPages: SerpCompetitorPage[];
  /** ช่องโหว่ที่บทความอันดับต้น ๆ ยังไม่ตอบ */
  gaps: string[];
  facts: SerpVerifiedFact[];
  /** โครงหัวข้อ (H2) ที่แนะนำ */
  outline: string[];
  /** คำถามที่คนค้นถามต่อ (People also ask) */
  questions: string[];
  /** slug สินค้าในเว็บเราที่เกี่ยวข้อง (ใช้เลือกรูปสินค้าจริงไปประกอบภาพ) */
  productSlugs: string[];
  /** ไม่มีในผลที่เก็บก่อนเพิ่มฟีเจอร์ — ระบบถือว่าผลนั้นเก่าและวิเคราะห์ใหม่ */
  writingStyle?: SerpWritingStyle;
  analyzedAt: string;
}

/** ค่าในตารางเทียบ 1 ช่อง — sourceUrl null = ไม่มีข้อมูลเปิดเผย */
export interface CompareCell {
  value: string;
  sourceUrl: string | null;
}

export interface CompareRow {
  criterion: string;
  /** เรียงตาม brands */
  cells: CompareCell[];
}

/** เทียบ "เช่ากับ LG Subscribe" กับ "ซื้อขาด" ของรุ่นเดียวกัน */
export interface BuyVsRentDataset {
  productSlug: string;
  productName: string;
  /** ค่าเช่าจากแคตตาล็อกเว็บเรา (ไม่ใช่ตัวเลขจาก AI) */
  rent: { monthly: number; months: number | null; sourceUrl: string };
  /**
   * ราคาซื้อขาดที่เปิดหน้าเว็บยืนยันแล้ว — null = หาแหล่งยืนยันไม่ได้
   * productName มีค่า = รุ่นเดียวกันไม่มีขายขาด จึงใช้รุ่นเทียบเคียงที่ขายขาด (ต้องบอกผู้อ่านตรง ๆ)
   */
  buy: { price: number; seller: string; sourceUrl: string; productName: string | null } | null;
  /** แถวเชิงเงื่อนไข: cells[0] = เช่า, cells[1] = ซื้อขาด */
  rows: CompareRow[];
}

/** ชุดข้อมูลตารางเทียบแบรนด์ที่ตรวจแหล่งแล้ว — เก็บใน SeoKeyword.serpBrief */
export interface CompareDataset {
  kind: "compare";
  /** ช่องแรกคือ LG Subscribe (ของเรา) เสมอ */
  brands: string[];
  rows: CompareRow[];
  /** ข้อสรุปแบบเป็นกลาง: ใครเหมาะกับใคร */
  verdicts: string[];
  /** แหล่งอ้างอิงทั้งหมดที่ใช้จริงในตาราง */
  sources: { title: string; url: string }[];
  asOf: string;
  /** ไม่มีในผลที่เก็บก่อนเพิ่มฟีเจอร์ / หาไม่ได้ */
  buyVsRent?: BuyVsRentDataset;
  serp?: SerpBrief;
}
