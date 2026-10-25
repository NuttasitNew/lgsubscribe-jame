import "server-only";

import { allProducts } from "@/lib/catalog-products";
import { siteConfig } from "@/lib/site";

export interface SiteCategoryContext {
  category: string;
  productCount: number;
  /** ราคาเช่าเริ่มต้นต่อเดือนที่ต่ำสุดในหมวด (บาท) — null = ไม่มีราคาป้าย */
  minMonthlyPrice: number | null;
  sampleProducts: string[];
}

export interface SiteProductContext {
  slug: string;
  name: string;
  model: string;
  category: string;
  monthlyPrice: number | null;
  contractMonths: number | null;
  /** path รูปสินค้าจริงในเว็บ (public/) ใช้เป็นรูปอ้างอิงตอนวาดภาพประกอบ */
  image: string;
  officialUrl: string | null;
}

/**
 * @description สรุป "เว็บเราขายอะไร" จากแคตตาล็อกจริงในโค้ด — ใช้เป็นข้อมูลตั้งต้นของ AI research ทุกตัว
 * @logic อ่านจาก allProducts (แหล่งเดียวกับหน้าเว็บ) จึงไม่หลุดจากสิ่งที่ลูกค้าเห็นบนเว็บจริง
 */
export const buildSiteContext = (): { categories: SiteCategoryContext[]; products: SiteProductContext[] } => {
  const products: SiteProductContext[] = allProducts.map((product) => ({
    slug: product.slug,
    name: product.name,
    model: product.model,
    category: product.category,
    monthlyPrice: product.monthlyPrice ?? null,
    contractMonths: product.contractMonths ?? null,
    image: product.image,
    officialUrl: product.imageSource ?? null,
  }));

  const byCategory = new Map<string, SiteProductContext[]>();
  for (const product of products) {
    byCategory.set(product.category, [...(byCategory.get(product.category) ?? []), product]);
  }

  const categories = [...byCategory.entries()].map(([category, items]) => {
    const prices = items.map((item) => item.monthlyPrice).filter((price): price is number => price != null);
    return {
      category,
      productCount: items.length,
      minMonthlyPrice: prices.length ? Math.min(...prices) : null,
      sampleProducts: items.slice(0, 4).map((item) => item.name),
    };
  });

  return { categories, products };
};

const normalizeProductKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * @description หาสินค้าในแคตตาล็อกจากสิ่งที่ AI ตอบมา — AI มักตอบเป็นชื่อรุ่น (wd516an) แทน slug (lg-puricare-wd516)
 * @logic ตรง slug ก่อน → ตรงรุ่น (ไม่สนตัวพิมพ์/ขีด/จุด) → รุ่นที่ AI ตอบขึ้นต้นด้วยรุ่นในแคตตาล็อก (เช่น WD516AN.ASLPLMT)
 */
export const resolveCatalogProduct = (
  value: string,
  products: SiteProductContext[]
): SiteProductContext | undefined => {
  const key = normalizeProductKey(value);
  if (!key) return undefined;
  return (
    products.find((p) => p.slug === value) ??
    products.find((p) => normalizeProductKey(p.slug) === key || normalizeProductKey(p.model) === key) ??
    products.find((p) => normalizeProductKey(p.model).length >= 5 && key.startsWith(normalizeProductKey(p.model)))
  );
};

/** ข้อความสรุปธุรกิจสำหรับใส่ใน prompt */
export const describeSiteForPrompt = (categories: SiteCategoryContext[]): string =>
  [
    `เว็บ ${siteConfig.url} (${siteConfig.name}) — ตัวแทนขาย LG Subscribe: เช่าใช้/เช่าซื้อเครื่องใช้ไฟฟ้า LG ชำระรายเดือน`,
    "ไม่กันวงเงินบัตรเต็มมูลค่า มีช่าง LG ดูแลถึงบ้านตามแพ็กเกจ ครบสัญญาแล้วกรรมสิทธิ์โอนให้ลูกค้าตามเงื่อนไขสัญญา ติดต่อ LINE @lgsubscribe",
    "หมวดสินค้าที่มีในแคตตาล็อก:",
    ...categories.map(
      (c) =>
        `- ${c.category}: ${c.productCount} รุ่น${c.minMonthlyPrice != null ? ` เริ่ม ${c.minMonthlyPrice.toLocaleString("th-TH")} บาท/เดือน` : ""} (เช่น ${c.sampleProducts.slice(0, 2).join(", ")})`
    ),
  ].join("\n");
