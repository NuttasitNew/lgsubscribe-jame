import { catalogProducts, getCatalogProduct } from "@/lib/catalog-products";
import type { Product } from "@/lib/site";

type ProductGroup = {
  label: string;
  category: string;
  /** Matched against the Google Ads keyword with spaces removed. */
  keywords: RegExp;
  /** Homepage pick first, then the lowest monthly plans people searching "รายเดือน" look for. */
  slugs?: readonly string[];
};

// Ordered by Google Ads search-term clicks, 1–30 Oct 2026.
const productGroups: readonly ProductGroup[] = [
  {
    label: "เครื่องซักผ้าและอบผ้า",
    category: "เครื่องซักผ้าและอบผ้า",
    keywords: /ซักผ้า|อบผ้า|wash/i,
    slugs: ["lg-washtower-wt1410nheg", "lg-front-load-fv1413s4m", "lg-tx2523at7g", "lg-fv1413h4m"],
  },
  {
    label: "ตู้เย็น",
    category: "ตู้เย็น",
    keywords: /ตู้เย็น/,
    slugs: ["lg-x257cmew", "lg-gn-f392pqak", "lg-gn-f452pqak", "lg-gn-v389fqef"],
  },
  {
    label: "เครื่องกรองน้ำ",
    category: "เครื่องกรองน้ำ",
    keywords: /กรองน้ำ/,
    slugs: ["lg-puricare-wd516", "lg-wd518an", "lg-wd110mn"],
  },
  {
    label: "แอร์",
    category: "เครื่องปรับอากาศ",
    keywords: /แอร์|ปรับอากาศ/,
    slugs: ["lg-saq11a", "lg-siq11b", "lg-siq13b", "lg-saq13a"],
  },
  { label: "เครื่องฟอกอากาศ", category: "เครื่องฟอกอากาศ", keywords: /ฟอกอากาศ/ },
  { label: "เครื่องลดความชื้น", category: "เครื่องลดความชื้น", keywords: /ลดความชื้น/ },
  { label: "เครื่องล้างจาน", category: "เครื่องล้างจาน", keywords: /ล้างจาน/ },
  { label: "ทีวี", category: "ทีวีและเครื่องเสียง", keywords: /ทีวี|tv|oled/i },
];

function groupProducts(group: ProductGroup): Product[] {
  if (!group.slugs) {
    return catalogProducts.filter((product) => product.category === group.category).slice(0, 4);
  }
  return group.slugs.flatMap((slug) => getCatalogProduct(slug) ?? []);
}

/** Keyword traffic sees its own category; everyone else sees the top pick of the leading categories. */
export function getSubscribeDayProducts(keyword?: string) {
  const compact = keyword?.replace(/\s+/g, "");
  const group = compact ? productGroups.find((item) => item.keywords.test(compact)) : undefined;
  if (group) return { label: group.label, category: group.category, products: groupProducts(group) };
  return {
    label: null,
    category: null,
    products: productGroups.slice(0, 4).flatMap((item) => groupProducts(item).slice(0, 1)),
  };
}
