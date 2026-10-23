import type { SeoDemandTier } from "../constant/seo-demand-tier";

/** สัดส่วนบนสุดที่นับเป็น "ถามเยอะ" (20% แรกของบริการที่มีงาน) */
const HIGH_RANK_RATIO = 0.2;
/** สะสมถึงสัดส่วนนี้นับเป็น "ถามปานกลาง" (20-50%) ที่เหลือเป็น "ถามน้อย" */
const MEDIUM_RANK_RATIO = 0.5;
/** ราคาตั้งแต่ percentile นี้ขึ้นไปนับเป็นงานราคาสูงของหมวด */
const HIGH_TICKET_PERCENTILE = 0.75;

/** บริการ 1 รายการก่อนจัดระดับ */
export interface ServiceDemandInput {
  serviceName: string;
  /** จำนวนชิ้นงานในรอบ 12 เดือน (0 = ไม่มีงานเลย) */
  orderCount: number;
  /** ราคาป้าย — null = งานราคาเหมาที่ไม่มีราคาป้าย */
  servicePrice: number | null;
}

/** บริการ 1 รายการหลังจัดระดับแล้ว */
export interface ClassifiedServiceDemand extends ServiceDemandInput {
  tier: SeoDemandTier;
  /** ราคาอยู่ใน 25% บนของหมวดไหม — ของแพงที่ยังไม่มีบทความคือช่องว่างที่คุ้มที่สุด */
  isHighTicket: boolean;
}

/**
 * @description หาค่า percentile ของชุดตัวเลข (nearest-rank) — ใช้กับราคาเพื่อหาเส้นแบ่ง "งานราคาสูง"
 * @logic ใช้ nearest-rank ไม่ใช่ interpolate เพราะราคาป้ายเป็นค่าที่มีอยู่จริงในแคตตาล็อก
 *        การ interpolate จะได้เส้นแบ่งที่เป็นราคาที่ไม่มีอยู่จริง อธิบายให้คนฟังไม่ได้
 * @param sortedAscending ตัวเลขที่เรียงน้อย→มากแล้ว
 * @param ratio สัดส่วน 0-1
 * @returns ค่า ณ percentile นั้น (ชุดว่าง = null)
 */
const percentile = (sortedAscending: number[], ratio: number): number | null => {
  if (sortedAscending.length === 0) return null;
  // floor ไม่ใช่ ceil: ต้องการ "ค่าแรกของกลุ่มบน" ไม่ใช่ค่าสุดท้ายของกลุ่มล่าง
  // ([100,200,300,400] ที่ 0.75 → index 3 = 400 → ได้ 25% บนพอดี / ceil จะได้ index 2 = 300 = ครึ่งหมวด)
  const index = Math.min(sortedAscending.length - 1, Math.floor(ratio * sortedAscending.length));
  return sortedAscending[Math.max(0, index)] ?? null;
};

/**
 * @description จัดระดับความต้องการของบริการทั้งหมดในหมวด (ถามเยอะ/กลาง/น้อย/ยังไม่มีใครถาม) + ติดป้ายงานราคาสูง
 * @logic
 * - **แบ่งด้วยอันดับ ไม่ใช่ค่าคงที่**: เกณฑ์แบบ "เกิน 50 ชิ้น = ถามเยอะ" ใช้ไม่ได้ข้ามหมวด
 *   หมวดเฟอร์นิเจอร์มีงานหลักพัน หมวดอุปกรณ์เด็กมีหลักสิบ — ตั้งเลขตายตัวแล้วหมวดเล็กจะไม่มี HIGH เลยสักตัว
 * - orderCount = 0 → UNTAPPED เสมอ ไม่เข้าการจัดอันดับ (ของที่ไม่เคยขายไม่ควรไปแย่งช่อง LOW
 *   ของที่ขายได้บ้าง — สองอย่างนี้ต้องการบทความคนละแบบ)
 * - เสมอกันได้อันดับเดียวกัน (ใช้ตำแหน่งแรกของกลุ่มค่าเท่ากัน) ไม่งั้นบริการที่ยอดเท่ากันเป๊ะ
 *   จะถูกแยกเป็นคนละระดับตามลำดับที่บังเอิญเรียงมา
 * - isHighTicket คิดจากราคาป้ายของ **ทั้งหมวด** (รวมตัวที่ไม่มีงาน) เพราะเป็นคุณสมบัติของบริการ ไม่ใช่ของยอดขาย
 *   บริการราคาเหมา (price = null) ไม่ถูกนับเป็น high ticket — ไม่มีราคาให้เทียบ
 * @param services บริการทั้งหมดในหมวด
 * @returns บริการพร้อมระดับ เรียงจากงานเยอะ→น้อย แล้วจึงเป็นกลุ่มที่ยังไม่มีงาน
 * @used-by {@link ../server/build-category-grounding.helper.ts}
 * @related {@link ../constant/seo-demand-tier.ts}
 */
export const classifyServiceDemand = (services: ServiceDemandInput[]): ClassifiedServiceDemand[] => {
  const prices = services
    .map((service) => service.servicePrice)
    .filter((price): price is number => price != null)
    .sort((a, b) => a - b);

  // ราคาเดียวกันหมด (หรือมีราคาเดียว) = ไม่มีใครแพงกว่าใคร → ไม่ติดป้ายใครเลย
  // ถ้าไม่กันไว้ หมวดที่ทุกชิ้นราคาเท่ากันจะถูกติดป้าย "งานราคาสูง" ทั้งหมวด ป้ายก็หมดความหมาย
  const hasPriceSpread = new Set(prices).size > 1;
  const priceThreshold = hasPriceSpread ? percentile(prices, HIGH_TICKET_PERCENTILE) : null;

  const isHighTicket = (price: number | null): boolean =>
    price != null && priceThreshold != null && price >= priceThreshold;

  const withOrders = services.filter((service) => service.orderCount > 0).sort((a, b) => b.orderCount - a.orderCount);
  const withoutOrders = services.filter((service) => service.orderCount <= 0);

  // อันดับของค่าที่เท่ากันต้องเป็นตัวเดียวกัน — จำตำแหน่งแรกที่เจอยอดนั้น
  const firstIndexByCount = new Map<number, number>();
  withOrders.forEach((service, index) => {
    if (!firstIndexByCount.has(service.orderCount)) firstIndexByCount.set(service.orderCount, index);
  });

  const total = withOrders.length;
  const classified = withOrders.map<ClassifiedServiceDemand>((service) => {
    const rank = firstIndexByCount.get(service.orderCount) ?? 0;
    const ratio = total > 0 ? (rank + 1) / total : 1;
    // อันดับ 1 เป็น HIGH เสมอ แม้หมวดจะเล็กจน 20% แรกไม่ถึง 1 ตัว
    // (หมวด 3 บริการ: 1/3 = 33% > 20% → ถ้าไม่ยกเว้นตรงนี้ หมวดเล็กจะไม่มี HIGH เลยสักตัว
    //  แล้วโควตาระดับ "ถามเยอะ" จะว่างทั้งที่หมวดนั้นมีตัวขายดีของมันอยู่จริง)
    const tier: SeoDemandTier =
      rank === 0 || ratio <= HIGH_RANK_RATIO ? "HIGH" : ratio <= MEDIUM_RANK_RATIO ? "MEDIUM" : "LOW";
    return { ...service, tier, isHighTicket: isHighTicket(service.servicePrice) };
  });

  return [
    ...classified,
    ...withoutOrders
      // ของแพงที่ยังไม่เคยขายขึ้นก่อน — เป็นช่องว่างที่มีมูลค่าต่อบทความสูงสุด
      .sort((a, b) => (b.servicePrice ?? 0) - (a.servicePrice ?? 0))
      .map<ClassifiedServiceDemand>((service) => ({
        ...service,
        tier: "UNTAPPED",
        isHighTicket: isHighTicket(service.servicePrice),
      })),
  ];
};
