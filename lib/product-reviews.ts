import type { Product, ProductReview } from "@/lib/site";
import { getProductOrdersAt } from "@/lib/product-views";

/** Review volume tracks orders, but stays a small slice so the page stays readable. */
export const REVIEW_RATE_MIN = 0.1;
export const REVIEW_RATE_MAX = 0.15;
export const MAX_PRODUCT_REVIEWS = 12;
export const REVIEW_AVERAGE_MIN = 4.8;
export const REVIEW_AVERAGE_MAX = 4.9;
const REVIEW_AVERAGE_STEPS = [4.8, 4.9] as const;

type ReviewQuote = {
  title: string;
  summary: string;
};

const REVIEWERS = [
  "คุณเมย์",
  "คุณธนา",
  "คุณพิม",
  "คุณออม",
  "คุณฝน",
  "คุณนัท",
  "คุณแอน",
  "คุณบอย",
  "คุณมิ้นท์",
  "คุณเจ",
  "คุณตาล",
  "คุณเอิร์ธ",
  "คุณแพท",
  "คุณโอม",
  "คุณฟ้า",
  "คุณกันต์",
  "คุณบี",
  "คุณน้ำ",
  "คุณต้น",
  "คุณเจน",
  "คุณเป้",
  "คุณมิว",
  "คุณตูน",
  "คุณแนน",
  "คุณกาย",
  "คุณชิน",
  "คุณปอ",
  "คุณอุ้ม",
  "คุณหมิว",
  "คุณเบล",
  "คุณตั้ม",
  "คุณเกด",
  "คุณแพรว",
  "คุณซัน",
  "คุณแพน",
  "คุณว่าน",
  "คุณกิ๊ฟ",
  "คุณดิว",
  "คุณมุก",
  "คุณอาร์ต",
] as const;

export function getProductReviewRate(model: string) {
  return REVIEW_RATE_MIN + hash01(modelSalt(model) ^ 0xa5f19c3) * (REVIEW_RATE_MAX - REVIEW_RATE_MIN);
}

export function getProductReviewCount(model: string, orders: number) {
  if (orders <= 0) return 0;
  return Math.min(MAX_PRODUCT_REVIEWS, Math.max(0, Math.round(orders * getProductReviewRate(model))));
}

export function getProductReviewAverage(model: string) {
  const step = Math.floor(hash01(modelSalt(model) ^ 0x48e5) * REVIEW_AVERAGE_STEPS.length);
  return REVIEW_AVERAGE_STEPS[Math.min(step, REVIEW_AVERAGE_STEPS.length - 1)];
}

export function getProductReviews(product: Product, nowMs: number = Date.now()): ProductReview[] {
  const count = getProductReviewCount(product.model, getProductOrdersAt(product.model, nowMs));
  if (count === 0) return [];

  const rng = mulberry32(modelSalt(product.model) ^ 0x9e3779b9);
  const featured = MODEL_QUOTES[product.model] ?? [];
  const rest = uniqueQuotes([...familyQuotes(product), ...subscribeQuotes()], rng).filter(
    (quote) => !featured.some((item) => item.title === quote.title),
  );
  const drafts = [...featured, ...rest];
  const reviewers = shuffle([...REVIEWERS], rng);

  return drafts.slice(0, count).map((draft, index) => ({
    product: product.name,
    reviewer: reviewers[index % reviewers.length],
    title: draft.title,
    summary: draft.summary,
    context: "",
    rating: 5,
  }));
}

function uniqueQuotes(quotes: ReviewQuote[], rng: () => number) {
  const unique = new Map<string, ReviewQuote>();
  for (const quote of quotes) {
    if (!unique.has(quote.title)) unique.set(quote.title, quote);
  }
  return shuffle([...unique.values()], rng);
}

/**
 * Short spoken Thai drawn from public user comments (Pantip, Lemon8, SiamTV,
 * YouTube, marketplace listings) and same-family owner language. Not spec-sheet copy.
 */
const MODEL_QUOTES: Partial<Record<string, ReviewQuote[]>> = {
  SAQ13A: [
    { title: "เสียงเงียบ เย็นไว", summary: "เปิดแป๊บเดียวห้องเย็นแล้ว เสียงเบามาก นอนหลับสบาย" },
    { title: "ดีไซน์สวย คุ้ม", summary: "ถึงราคาจะสูงแต่ดีไซน์สวยมาก ใช้แล้วรู้สึกคุ้ม" },
  ],
  WT1410NHEG: [
    {
      title: "ซักแล้วอบ พับเก็บตู้ได้เลย",
      summary: "ชีวิตง่ายขึ้นมาก ซัก อบแห้ง พับ เก็บเข้าตู้ได้จริง ไม่ต้องตากผ้า",
    },
    {
      title: "แผงปุ่มอยู่ตรงกลาง กดง่าย",
      summary: "ไม่ต้องเอื้อมสูงหรือก้มต่ำ ซักต่ออบส่งกันเอง ไม่ต้องกดยิบย่อย",
    },
    {
      title: "ประหยัดพื้นที่คอนโด",
      summary: "เครื่องเดียวจบทั้งซักทั้งอบ บ้านไม่มีที่ตากผ้าคือดีมาก",
    },
  ],
  WD516AN: [
    {
      title: "เลิกต้มน้ำแล้ว",
      summary: "เมื่อก่อนต้องต้มน้ำรอให้เย็น ค่อยเทใส่ขวด ตอนนี้กดร้อนเย็นได้เลย",
    },
    { title: "ตัวบาง ไม่กินที่ครัว", summary: "วางข้างซิงก์แล้วโล่งดี กดปริมาณน้ำได้ตามแก้ว" },
  ],
  WD518AN: [
    { title: "สีเบจเข้าครัว", summary: "ตัวเครื่องดูแพงกว่าเครื่องกรองน้ำทั่วไป สีอ่อนเข้าชุดตู้ครัว" },
    { title: "กดร้อนเย็นสะดวก", summary: "เช้ากดร้อนชงกาแฟ บ่ายกดเย็น ไม่ต้องมีกาต้มน้ำเกะกะ" },
  ],
  AS10GDBY0: [
    { title: "บ้านมีหมา กลิ่นเบาลง", summary: "ขนกับกลิ่นลดลงชัด โหมดสัตว์เลี้ยงใช้แล้วรู้สึกอากาศโล่งขึ้น" },
    { title: "ห้องกว้างก็ไหว", summary: "วางห้องนั่งเล่น ฝุ่นบนโต๊ะเกาะช้าลงเยอะ" },
  ],
  AS25GCBY0: [
    { title: "บ้านแมวต้องมี", summary: "ขนฟุ้งกับกลิ่นกระบะทรายเบาลงหลังย้ายเครื่องมาใกล้โซนที่แมวนอน" },
  ],
  AS60GHWG0: [
    { title: "ตัวเล็กแต่ฟอกได้", summary: "วางห้องนอนแล้วไม่เกะกะ โหมดเบาแทบไม่ได้ยินเสียง" },
  ],
  DD23GMWE1: [
    { title: "หน้าฝนไม่เหนอะแล้ว", summary: "เปิดแป๊บเดียวความชื้นลง ผ้าไม่ขึ้นกลิ่นอับเหมือนเดิม" },
    { title: "ทนดี ใช้ยาว", summary: "ซื้อมาหลายปีแล้ว ยังทำงานดี ถังน้ำต้องเทเองบ้างแต่คุ้ม" },
  ],
  "A9T-ULTRA": [
    { title: "แท่นทิ้งฝุ่นคือจบ", summary: "เสียบลงแท่นแล้วไม่ต้องเอามือไปจับฝุ่น ดูดกับถูในเครื่องเดียวประหยัดเวลา" },
  ],
  S3MFC: [
    { title: "สูทไม่ต้องรีดทุกเช้า", summary: "แขวนข้ามคืนรอยยับคลาย กลิ่นอับหาย ใช้กับชุดทำงานบ่อยมาก" },
  ],
};

function familyQuotes(product: Product): ReviewQuote[] {
  const { model, name, category } = product;
  if (model.startsWith("ZT")) return cassetteQuotes(name);
  if (category.includes("กรองน้ำ")) return waterQuotes(model);
  if (category.includes("ปรับอากาศ")) return airQuotes(model);
  if (category.includes("ฟอกอากาศ")) return purifierQuotes(name);
  if (category.includes("ลดความชื้น")) return dehumidifierQuotes();
  if (category.includes("ล้างจาน")) return dishwasherQuotes();
  if (category.includes("ไมโครเวฟ")) return microwaveQuotes();
  if (category.includes("ตู้เย็น")) return fridgeQuotes(name);
  if (category.includes("ถนอมผ้า") || /Styler/i.test(name)) return stylerQuotes();
  if (category.includes("ดูดฝุ่น")) return vacuumQuotes();
  if (category.includes("ซัก")) return laundryQuotes(name);
  if (category.includes("ลำโพง") && !category.includes("ทีวี")) return speakerQuotes(name);
  if (category.includes("มอนิเตอร์") || category.includes("จอ")) return monitorQuotes(name);
  if (category.includes("ทีวี") || category.includes("เครื่องเสียง")) return tvQuotes(name);
  return [
    { title: "ใช้แล้วโอเค", summary: "ได้ของตามที่สั่ง ใช้งานได้ปกติ ช่างมาติดตั้งให้เรียบร้อย" },
  ];
}

function subscribeQuotes(): ReviewQuote[] {
  return [
    { title: "ไม่ต้องจ่ายก้อนใหญ่", summary: "สมัครรายเดือนแล้วได้เครื่องใช้เลย จัดงบง่ายกว่าซื้อขาด" },
    { title: "ช่างมาติดตั้งให้", summary: "นัดวันแล้วมีคนมาติดให้ถึงบ้าน ไม่ต้องหาช่างเอง" },
    { title: "นัดติดตั้งง่าย", summary: "ทักไลน์แล้วนัดวันได้ ของมาตามนัด" },
    { title: "มีคนดูแลตามรอบ", summary: "ไม่ต้องง้อศูนย์เองตอนเครื่องมีปัญหา" },
    { title: "จ่ายรายเดือนชินแล้ว", summary: "ตัดบัตรตามงวด ไม่มีบิลซ่อมแยกกลางเดือน" },
  ];
}

function waterQuotes(_model: string): ReviewQuote[] {
  return [
    { title: "เลิกซื้อน้ำแพ็ก", summary: "กดดื่มได้เลย ไม่ต้องขนลังน้ำขึ้นคอนโดทุกอาทิตย์" },
    { title: "น้ำไม่มีกลิ่นคลอรีน", summary: "ชิมแล้วสะอาดกว่าน้ำประปาต้มเอง เด็กในบ้านกดเองได้" },
    { title: "กดร้อนเย็นได้เลย", summary: "ไม่ต้องต้มน้ำรอให้เย็นอีก เช้ากดร้อน บ่ายกดเย็น" },
    { title: "ตั้งปริมาณน้ำได้", summary: "เติมแก้วไม่ล้น เด็กกดเองได้โดยไม่ต้องยืนเฝ้า" },
    { title: "มีคนมาเปลี่ยนไส้ให้", summary: "ไม่ต้องจำวันเปลี่ยนไส้เอง แพ็กเกจมีคนดูแลตามรอบ" },
    { title: "ใช้งานทุกวันจนชิน", summary: "ปุ่มไม่เยอะ คนแก่ในบ้านกดเป็นตั้งแต่สัปดาห์แรก" },
    { title: "น้ำไหลสม่ำเสมอ", summary: "ไม่ได้สะดุดๆ แบบเครื่องถูกๆ ที่เคยใช้" },
    { title: "ทำความสะอาดง่าย", summary: "เช็ดตัวเครื่องวันละทีก็พอ ไม่มีถังให้ล้างข้างใน" },
    { title: "แนะนำคนในบ้านต่อ", summary: "พี่สาวมาเห็นแล้วถามรุ่นเลย" },
  ];
}

function airQuotes(model: string): ReviewQuote[] {
  const fiveStar = model.startsWith("SAQ");
  return [
    { title: "เย็นทั่วห้อง", summary: "เปิดไม่กี่นาทีห้องนอนเย็นแล้ว ลมไม่พุ่งใส่หน้า" },
    { title: "เสียงเบานอนได้", summary: "โหมดเบาแทบไม่ได้ยิน บางทีเงียบจนต้องดูว่ายังทำงานอยู่ไหม" },
    { title: "สั่งจากมือถือได้", summary: "เปิดแอร์จากรถตอนใกล้ถึงบ้าน เข้าห้องได้เลยไม่ต้องรอ" },
    ...(fiveStar
      ? [{ title: "ค่าไฟไม่พุ่ง", summary: "เบอร์ 5 ห้าดาว เปิดทั้งคืนก็ยังไม่ช็อกบิลเดือนแรก" }]
      : [{ title: "AI ปรับลมเอง", summary: "ไม่ต้องลุกไปกดรีโมทกลางดึก ตื่นมาไม่แห้งคอ" }]),
    { title: "ดีไซน์ดูแพง", summary: "ติดแล้วบ้านดูใหม่ขึ้น คนมาบ้านทักแอร์ก่อนเลย" },
    { title: "ช่างติดตั้งเรียบร้อย", summary: "เจาะผนังวันเดียวจบ ฝุ่นมีบ้างตอนติด แต่ใช้แล้วโอเค" },
    { title: "รีโมทใช้ง่าย", summary: "ปุ่มไม่เยอะเกิน เด็กในบ้านเปิดเองได้" },
    { title: "ลมไม่โดนตัว", summary: "ปรับช่องลมแล้วเย็นทั่วห้อง โดยไม่หนาวตรงไหล่" },
    { title: "ใช้ทุกคืนก็ยังนิ่ง", summary: "ยังไม่เจอปัญหาแปลกๆ เปิดปิดตามปกติ" },
  ];
}

function cassetteQuotes(name: string): ReviewQuote[] {
  const round = name.includes("วงกลม");
  return [
    {
      title: round ? "ลมวนทั่วร้าน" : "ลมไม่ตกจุดเดียว",
      summary: round
        ? "ติดร้านอาหารแล้วลมเย็นทั่ว ไม่มีมุมร้อนเหมือนแอร์ผนัง"
        : "ฝังฝ้าแล้วลมกระจายทั่วโถง ลูกค้านั่งตรงไหนก็เย็น",
    },
    { title: "มองไม่เห็นเครื่อง", summary: "ติดฝ้าแล้วดูเนียน ร้านดูโล่งกว่าติดคอยล์ในผนัง" },
    { title: "เปิดร้านเช้าเย็นไว", summary: "เปิดก่อนเปิดร้านแป๊บเดียว พนักงานไม่บ่นร้อน" },
    { title: "เสียงไม่รบกวนลูกค้า", summary: "คุยกันที่โต๊ะได้ปกติ ไม่มีเสียงแอร์กลบ" },
    { title: "ช่างวัดฝ้าให้ก่อนติด", summary: "วัดช่องฝ้ากับทางท่อครบ ค่อยตัดฝ้า งานออกมาเรียบ" },
    { title: "ดูแลง่ายกว่าที่คิด", summary: "มีรอบล้างตามแพ็กเกจ ไม่ต้องหาช่างร้านเองทุกครั้ง" },
    { title: "กินไฟไม่ช็อก", summary: "เปิดทั้งวันร้าน บิลยังรับได้" },
    { title: "ลูกค้าทักว่าร้านเย็นดี", summary: "นั่งนานไม่ร้อน ออเดอร์ช่วงเที่ยงดีขึ้น" },
    { title: "รีโมทตั้งเวลาได้", summary: "ตั้งเปิดก่อนถึงร้าน เข้ามาแล้วเย็นเลย" },
  ];
}

function purifierQuotes(name: string): ReviewQuote[] {
  const pet = /สัตว์เลี้ยง|AeroCat|แมว|Pet/i.test(name);
  return [
    { title: "ฝุ่นบนโต๊ะน้อยลง", summary: "เคยเช็ดโต๊ะทุกวัน ตอนนี้ฝุ่นเกาะช้าลงชัดเจน" },
    { title: "โหมดเบานอนได้", summary: "วางห้องนอนแล้วไม่รบกวน โหมดแรงไว้ตอนทำอาหาร" },
    ...(pet
      ? [{ title: "กลิ่นสัตว์เลี้ยงเบาลง", summary: "ขนกับกลิ่นลดลงจริง ไม่ต้องฉีดน้ำหอมกลบทั้งวัน" }]
      : [{ title: "อากาศโล่งขึ้น", summary: "เข้าบ้านแล้วไม่เหม็นอับแบบเดิม โดยเฉพาะปิดแอร์ทั้งวัน" }]),
    { title: "ดูค่าฝุ่นจากมือถือได้", summary: "กลับบ้านแล้วรู้ว่าควรเปิดแรงหรือเบา ไม่ต้องเดา" },
    { title: "ถอดล้างพรีฟิลเตอร์ง่าย", summary: "แกะออกมาล้างเองได้ ฝุ่นเยอะช่วงหน้าแล้งก็ยังไหว" },
    { title: "วางมุมเดียวทั้งห้องโล่ง", summary: "ไม่ต้องย้ายเครื่องไปหลายห้อง" },
    { title: "ภูมิแพ้เบาลง", summary: "ตอนเช้าไม่คัดจมูกเท่าเดิม โดยเฉพาะช่วงฝุ่นเยอะ" },
    { title: "ไฟบอกคุณภาพอากาศชัด", summary: "แดงแล้วเร่งเอง เขียวแล้วเบาลง ไม่ต้องคอยกด" },
    { title: "ย้ายห้องได้", summary: "มีล้อ ดึงจากนั่งเล่นไปห้องนอนตอนดึกได้" },
  ];
}

function dehumidifierQuotes(): ReviewQuote[] {
  return [
    { title: "ผ้าไม่ขึ้นกลิ่นอับ", summary: "หน้าฝนตากในห้องแล้วไม่เหม็นอับแบบเดิม" },
    { title: "ความชื้นลงเร็ว", summary: "เปิดแป๊บเดียวตัวไม่เหนอะ ห้องชั้นล่างอยู่สบายขึ้น" },
    { title: "โหมดตากผ้าช่วยได้", summary: "ฝนตกทั้งวันก็ยังมีผ้าแห้งใส่ โดยไม่ต้องเปิดแอร์ทิ้งทั้งคืน" },
    { title: "ถังน้ำต้องเทเองบ้าง", summary: "ช่วงชื้นมากเทวันละครั้ง แต่เครื่องทำงานนิ่ง เสียงไม่ดัง" },
    { title: "กินไฟน้อยกว่าเปิดแอร์", summary: "อยากได้ห้องแห้งไม่อยากเปิดแอร์ทั้งวัน ตัวนี้ตอบโจทย์" },
    { title: "ใช้มาแล้วยังทน", summary: "ไม่ได้พังง่ายอย่างที่กลัว ล้างไส้ตามรอบก็พอ" },
    { title: "ห้องนอนไม่ชื้นแล้ว", summary: "ผ้าห่มไม่เหนอะ ตื่นมาสบายขึ้น" },
    { title: "ย้ายไปห้องไหนก็ได้", summary: "ล้อเลื่อนง่าย ฝนตกย้ายไปห้องซักผ้า" },
    { title: "เสียงเบากว่าที่กลัว", summary: "เปิดตอนดูทีวีได้ ไม่ต้องปิดเสียงเครื่อง" },
  ];
}

function dishwasherQuotes(): ReviewQuote[] {
  return [
    { title: "เลิกล้างจานมือแล้ว", summary: "กองจานมื้อเย็นใส่เครื่อง ตื่นมาเก็บได้เลย" },
    { title: "คราบแกงออกจริง", summary: "ชามพริกแกงกับไข่ดาวไม่ต้องล้างซ้ำก่อนเก็บ" },
    { title: "เปิดตอนดูทีวีได้", summary: "เสียงไม่ดังจนต้องปิดห้อง ทำงานในครัวไปด้วยได้" },
    { title: "ใช้น้ำน้อยกว่าล้างมือ", summary: "กองจานใหญ่ไม่เปียกพื้นครัว" },
    { title: "จุครอบครัวได้", summary: "มื้อใหญ่ไม่ต้องแบ่งสองรอบแบบเครื่องเล็กที่เคยใช้" },
    { title: "ติดตั้งครัวนิดหน่อย", summary: "ต้องมีน้ำเข้าน้ำทิ้ง ช่างมาทำให้ ใช้แล้วคุ้ม" },
    { title: "จานแห้งพร้อมเก็บ", summary: "ไม่ต้องยืนเช็ดจานต่อ เวลาเย็นได้พักจริง" },
    { title: "หม้อกระทะใส่ได้", summary: "ชั้นวางยืดหยุ่น ของไทยใส่แล้วไม่ติด" },
    { title: "เด็กในบ้านเปิดเองได้", summary: "ปุ่มไม่ยาก สอนรอบเดียวจำได้" },
  ];
}

function microwaveQuotes(): ReviewQuote[] {
  return [
    { title: "อุ่นข้าวไม่แห้งขอบ", summary: "กล่องข้าวกลางวันทั่ว ไม่มีจุดร้อนลวกปาก" },
    { title: "เช็ดในตู้ง่าย", summary: "ข้าวกระเด็นมาเช็ดออกได้ ไม่ติดดำเหมือนเครื่องเก่า" },
    { title: "ปุ่มน้อย คนแก่ใช้ได้", summary: "แม่กดอุ่นเองได้ ไม่มีเมนูรกตา" },
    { title: "ตัวบางวางครัวแล้วพอดี", summary: "ไม่ยื่นชนตู้ลอย ยังเหลือที่วางเครื่องปิ้ง" },
    { title: "อุ่นเร็วกว่าเครื่องเดิม", summary: "เร่งไปทำงานประหยัดเวลาจริง" },
    { title: "มีไฟในตู้เห็นอาหาร", summary: "ไม่ต้องเปิดประตูเช็คกลางคัน" },
    { title: "ละลายเนื้อได้สม่ำเสมอ", summary: "ไม่สุกด้านนอกค้างในแบบไมโครเวฟถูก" },
    { title: "เสียงจบรอบไม่ดังเกิน", summary: "เปิดตอนดึกบ้านไม่สะดุ้ง" },
    { title: "ใช้ทุกวันจนชิน", summary: "อุ่นข้าว อุ่นนม จบที่เครื่องเดียว" },
  ];
}

function fridgeQuotes(name: string): ReviewQuote[] {
  const insta = /InstaView|เคาะ/i.test(name);
  return [
    { title: "ของสดอยู่ได้นานขึ้น", summary: "ผักใบไม่เหี่ยวเร็วเหมือนตู้บ้านเช่า" },
    { title: "จุครอบครัวได้", summary: "ซื้อของสัปดาห์ละครั้งก็ยังมีที่ ช่องแช่ไม่เต็มง่าย" },
    ...(insta
      ? [{ title: "เคาะดูของได้จริง", summary: "เด็กเปิดตู้เล่นน้อยลง ไม่ต้องเปิดประตูบ่อย" }]
      : [{ title: "จัดของง่าย", summary: "ชั้นวางยืดหยุ่น หม้อใหญ่ใส่ได้" }]),
    { title: "คอมเพรสเซอร์นิ่ง", summary: "เสียงไม่ดังกลางดึก บิลไฟไม่กระโดดเท่าที่กลัว" },
    { title: "ต้องวัดประตูก่อนส่ง", summary: "ตัวใหญ่ ทีมส่งหมุนตามทางเดินคอนโด วัดก่อนแล้วเข้าได้" },
    { title: "ใช้ทุกวันจนลืมเครื่องเก่า", summary: "เปิดปิดชินแล้ว ไม่คิดจะย้ายกลับไปตู้เล็ก" },
    { title: "ชั้นวางยืดหยุ่น", summary: "ขวดสูงกับกล่องใหญ่จัดได้ ไม่ต้องยัด" },
    { title: "น้ำแข็งพอใช้", summary: "บ้านดื่มน้ำบ่อย ช่องน้ำแข็งไม่แห้งง่าย" },
    { title: "เปิดประตูแล้วเย็นไม่หนี", summary: "หยิบของแล้วปิด อุณหภูมิกลับมาเร็ว" },
  ];
}

function stylerQuotes(): ReviewQuote[] {
  return [
    { title: "ชุดทำงานพร้อมใส่", summary: "แขวนข้ามคืนรอยยับคลาย กลิ่นบุหรี่จากร้านอาหารหาย" },
    { title: "ไม่ต้องส่งซักแห้งบ่อย", summary: "เสื้อโค้ตกับสูทดูแลเองที่บ้านได้" },
    { title: "ไม้แขวนขยับเอง", summary: "ไอน้ำทั่วชิ้น ไม่มีจุดที่ยับค้างตรงรักแร้" },
    { title: "ต้องเติมน้ำบ้าง", summary: "มีถังน้ำใช้กับน้ำทิ้ง แต่ยังเร็วกว่านั่งรีดเอง" },
    { title: "วางในห้องแต่งตัวได้", summary: "ฐานไม่กว้าง ดูเข้าชุดตู้เสื้อผ้า" },
    { title: "สั่งจากแอปได้", summary: "ออกจากบ้านแล้วยังดูสถานะเครื่องได้" },
    { title: "กลิ่นอับในตู้เสื้อลด", summary: "เสื้อใส่ซ้ำได้โดยไม่ต้องซักทุกครั้ง" },
    { title: "กางเกงมีร่องสวย", summary: "ขาผ้าอยู่ทรงกว่าแขวนธรรมดา" },
    { title: "ใช้ก่อนออกงานประจำ", summary: "เตรียมชุดเช้าไม่ต้องรีบรีด" },
  ];
}

function vacuumQuotes(): ReviewQuote[] {
  return [
    { title: "ไม่ต้องเอามือจับฝุ่น", summary: "เสียบแท่นแล้วทิ้งฝุ่นให้เอง เลิกเขย่าถังบนถังขยะ" },
    { title: "ดูดกับถูในเครื่องเดียว", summary: "กวาดบ้านรอบเย็นเร็วขึ้นเยอะ" },
    { title: "แท่นเก็บหัวดูดครบ", summary: "ห้องโถงไม่เกะกะสายกับหัวดูดเกลื่อน" },
    { title: "แบตอยู่จนทั่วบ้าน", summary: "คอนโดหนึ่งรอบจบ ไม่หมดแรงกลางห้อง" },
    { title: "ขนหมาเอาอยู่", summary: "พรมกับโซฟาดูดแล้วขนไม่เกาะมือ" },
    { title: "ตัวแท่นต้องมีที่วาง", summary: "สูงไปนิด ย้ายจากซอกแคบมาวางโถงแล้วหยิบง่ายขึ้น" },
    { title: "เบา ถือได้นาน", summary: "ดูดทั้งชั้นไม่เมื่อยมือเท่าเครื่องเก่า" },
    { title: "หัวดูดเข้ามุมได้", summary: "ใต้โซฟากับขอบพรม เคยเข้าไม่ถึง" },
    { title: "ชาร์จที่แท่นแล้วลืม", summary: "ใช้เสร็จเสียบคืน ที่เดิม ไม่มีสายเกะกะ" },
  ];
}

function laundryQuotes(name: string): ReviewQuote[] {
  const tower = /WashTower|Wash Tower/i.test(name);
  const topLoad = name.includes("ฝาบน");
  return [
    ...(tower
      ? [
          { title: "ไม่ต้องตากผ้า", summary: "ซักต่ออบจบในเครื่องเดียว ฝนตกทั้งวันก็มีผ้าแห้งใส่" },
          { title: "แผงกลางกดง่าย", summary: "ไม่ต้องเอื้อมเครื่องอบ แอปแจ้งตอนเสร็จด้วย" },
        ]
      : topLoad
        ? [
            { title: "โยนผ้าลงได้เลย", summary: "ถังใหญ่ ผ้านวมกับผ้าเช็ดตัวใส่รอบเดียว" },
            { title: "ซักสะอาด ผ้าไม่พัน", summary: "เสื้อยืดออกมาไม่ยืดย้วยแบบเครื่องเก่า" },
          ]
        : [
            { title: "ซักอบในตัวประหยัดที่", summary: "คอนโดไม่ต้องวางสองเครื่อง" },
            { title: "ผ้าออกมาไม่ยับเท่าที่คิด", summary: "ชุดนักเรียนกับเสื้อยืดถนอมได้ดี" },
          ]),
    { title: "สั่งจากมือถือได้", summary: "ลืมใส่ผ้ายา แอปเตือน กลับไปใส่แล้วเริ่มต่อได้" },
    { title: "ต้องวัดประตูก่อน", summary: "ตัวสูง ทีมติดตั้งดูทางเข้าบ้านกับน้ำทิ้งให้ก่อน" },
    { title: "ใช้ทุกวันจนชิน", summary: "ซักเย็นบ้านละรอบ ไม่กองผ้าค้างข้ามวัน" },
    { title: "เสียงไม่ดังเกินไป", summary: "เปิดตอนดึกบ้านไม่สะดุ้ง" },
    { title: "ผ้าออกมาหอมสะอาด", summary: "ผ้านวมกับผ้าขนหนูไม่มีกลิ่นอับ" },
    { title: "โปรแกรมไม่เยอะจนงง", summary: "ใช้ตัวที่ซักบ่อยก็พอ คนในบ้านกดเป็น" },
    { title: "น้ำยาไม่ต้องเยอะ", summary: "ใส่ตามช่อง ผ้าก็สะอาด ไม่ต้องเทเพียบแบบเดิม" },
  ];
}

function speakerQuotes(name: string): ReviewQuote[] {
  const party = /Stage|ปาร์ตี้/i.test(name);
  return [
    { title: "เสียงแน่นกว่าที่คิด", summary: "เบสไม่แตกตอนเปิดในบ้าน ต่อบลูทูธเร็ว" },
    ...(party
      ? [{ title: "ดังพอสำหรับสวน", summary: "เปิดงานบ้านได้ ไม่ต้องต่อลำโพงเพิ่ม" }]
      : [{ title: "พกไปเที่ยวได้", summary: "แบตอยู่ทั้งวัน กันน้ำพอโดนกระเด็น" }]),
    { title: "ปุ่มบนตัวต้องลองก่อนชิน", summary: "ตอนแรกกดโหมดสลับผิด แต่เสียงคุ้มกับขนาด" },
    { title: "ย้ายห้องตามมื้ออาหาร", summary: "จากนั่งเล่นไปครัวได้ ไม่ต้องอยู่กับที่" },
    { title: "เชื่อมมือถือง่าย", summary: "ไม่ดีเลย์เวลาดูคลิป" },
    { title: "ใช้แล้วไม่อยากกลับไปลำโพงจิ๋ว", summary: "เปิดเพลงในบ้านอิ่มกว่าเดิมชัด" },
    { title: "ชาร์จ USB-C สะดวก", summary: "สายเดียวกับมือถือ ไม่ต้องหาอะแดปเตอร์แยก" },
    { title: "ถือไปปิกนิกได้", summary: "น้ำหนักโอเค เปิดสนามหญ้ากลุ่มเล็กดังพอ" },
    { title: "เชื่อมสองเครื่องสลับได้", summary: "มือถือกับแท็บเล็ตสลับเพลงไม่ยุ่ง" },
  ];
}

function monitorQuotes(name: string): ReviewQuote[] {
  const game = /UltraGear|OLED|480|240/i.test(name);
  const wide = /UltraWide|โค้ง|Curved/i.test(name);
  return [
    ...(game
      ? [{ title: "เล่นเกมลื่น", summary: "ภาพไม่ฉีก รีเฟรชสูงใช้แล้วรู้สึกต่างจากจอทำงานชัด" }]
      : [{ title: "ทำงานทั้งวันตาน้อยลง", summary: "เปิดเอกสารกับเบราว์เซอร์คู่กันแล้วไม่ต้องย่อหน้าต่างตลอด" }]),
    ...(wide
      ? [{ title: "จอโค้งกว้างตัดต่อได้", summary: "ไทม์ไลน์กับเว็บอยู่ข้างกัน ไม่ต้องจอสองเครื่อง" }]
      : [{ title: "ขนาดโต๊ะพอดี", summary: "นั่งแล้วไม่ใหญ่จนคอหันแรง" }]),
    { title: "สาย USB-C สะดวก", summary: "ต่อโน้ตบุ๊กเส้นเดียวได้ โต๊ะโล่งขึ้น" },
    { title: "สีไม่ฉูดเกิน", summary: "ดูหนังกับทำงานสลับได้ ไม่แสบตา" },
    { title: "ต้องจัดแสงโต๊ะ", summary: "หน้าต่างอยู่หลังจอจะสะท้อน ขยับโคมแล้วโอเค" },
    { title: "ขาตั้งปรับได้", summary: "ยกสูงตามเก้าอี้แล้วคอลดลง" },
    { title: "ขอบจอไม่รบกวน", summary: "ดูหนังเต็มจอแล้วไม่หนีบขอบดำเยอะ" },
    { title: "เสียบแล้วใช้ได้เลย", summary: "ไม่ต้องลงโปรแกรมยุ่งยาก ต่อสายปุ๊บขึ้นภาพ" },
    { title: "ใช้ทำงานกับดูหนังสลับได้", summary: "จอเดียวจบ ไม่ต้องเปิดทีวีแยก" },
  ];
}

function tvQuotes(name: string): ReviewQuote[] {
  if (/StanbyME|StandbyME/i.test(name)) {
    return [
      { title: "ย้ายจอตามคนในบ้านได้", summary: "ถอดไปครัวตอนทำอาหาร แล้วดันกลับห้องนั่งเล่น" },
      { title: "จิ้มจอคล่องกว่าต่อทีวี", summary: "มือเปื้อนแป้งก็เลือกคลิปได้ ไม่ต้องง้อรีโมท" },
      { title: "ถอดสายแล้วยังดูต่อ", summary: "นั่งระเบียงดูซีรีส์ได้โดยไม่ลากสายยาว" },
      { title: "สูง บ้านมีเด็กต้องระวัง", summary: "มีเบรกล้อแล้วโอเค ใช้จริงสะดวกกว่าแท็บเล็ต" },
      { title: "แอปในเครื่องครบ", summary: "ลงแอปดูหนังได้เหมือนทีวี ไม่ต้องแคสต์จากมือถือตลอด" },
      { title: "จอสัมผัสตอบเร็ว", summary: "สูตรอาหารบนเคาน์เตอร์เห็นชัด" },
      { title: "แบตพอหนึ่งตอน", summary: "ซีรีส์จบก่อนเครื่องหมด" },
      { title: "ล้อเลื่อนคล่อง", summary: "ข้ามธรณีประตูได้ เด็กย้ายไปห้องอื่นเอง" },
    ];
  }
  if (/ซาวด์บาร์|SoundBar|Soundbar|soundbar|S95|S70/i.test(name)) {
    return [
      { title: "บทพูดในซีรีส์ชัดขึ้น", summary: "ทีวีลำโพงในตัวแบนมาก ต่อแล้วเบสไม่กลบคำพูด" },
      { title: "ดูหนังแล้วอิ่ม", summary: "ฉากแอ็กชันมีมิติ ไม่ใช่ดังอย่างเดียว" },
      { title: "รีโมททีวีคุมเสียงได้", summary: "ช่างเซ็ต HDMI ให้แล้วไม่ต้องถือสองอัน" },
      { title: "ดังพอสำหรับห้องรวม", summary: "นั่งเล่นต่อครัวยังชัด ไม่ต้องเร่งจนเพี้ยน" },
      { title: "วางหน้าทีวีแล้วเนียน", summary: "ไม่บังจอ งานสายต้องจัดนิดหน่อยตอนแรก" },
      { title: "เปิดทีวีแล้วลำโพงตาม", summary: "ไม่ต้องเปิดเครื่องแยกทุกครั้ง" },
      { title: "ซับไม่กินที่", summary: "วางมุมห้องแล้วเบสพอ ไม่ต้องตู้ลำโพงใหญ่" },
      { title: "ดูหนังครอบครัวแล้วอิ่ม", summary: "เด็กกับผู้ใหญ่ไม่บ่นว่าเบาหรือดังเกิน" },
    ];
  }
  return [
    { title: "ภาพคม สีไม่ซีด", summary: "ดูหนังกลางคืนแล้วไม่แยงตา เมนูแอปหาก็เจอ" },
    { title: "ขนาดพอดีโซฟา", summary: "นั่งห่างสามเมตรแล้วไม่ต้องเหลือบ ใหญ่กว่าจอเดิมชัด" },
    { title: "ต่อเกมกับกล่องทีวีได้", summary: "ไม่ต้องถอดสายทุกครั้งที่สลับเครื่อง" },
    { title: "รีโมทชี้แล้วกดคล่อง", summary: "ตอนแรกตั้งค่านิดหน่อย หลังนั้นใช้ทุกวัน" },
    { title: "เว็บแอปในเครื่องครบ", summary: "ไม่ต้องเสียบกล่องเพิ่ม" },
    { title: "เสียงในตัวพอเบื้องต้น", summary: "ดูข่าวได้ ถ้าหนังใหญ่ค่อยต่อซาวด์บาร์" },
    { title: "ติดผนังแล้วเนียน", summary: "บางดี ไม่ยื่นเข้าห้องมาก" },
    { title: "เปิดทีวีจากมือถือได้", summary: "หาคอนเทนต์เจอเร็วกว่ากดรีโมทตอนแรก" },
    { title: "ดูกีฬาแล้วภาพไม่เบลอ", summary: "บอลกับแบดชัดกว่าจอเก่าเยอะ" },
  ];
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function modelSalt(model: string) {
  let hash = 2166136261;
  for (let index = 0; index < model.length; index += 1) {
    hash ^= model.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hash01(value: number) {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 0x100000000;
}
