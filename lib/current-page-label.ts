import { allProducts } from "@/lib/catalog-products";

const staticPageLabels: Record<string, string> = {
  "/": "หน้าแรก",
  "/products": "สินค้าทั้งหมด",
  "/contact": "ติดต่อเรา",
  "/application-guide": "ขั้นตอนการสมัคร",
  "/faq": "คำถามที่พบบ่อย",
  "/authorized": "ความน่าเชื่อถือ",
  "/service-and-maintenance": "บริการดูแลและบำรุงรักษา",
  "/what-is-lg-subscribe": "LG Subscribe คืออะไร",
};

function normalizePathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/$/, "");
}

export function getCurrentPageLabel(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  const currentProduct = allProducts.find((product) => `/products/${product.slug}` === normalizedPathname);

  return currentProduct?.name ?? staticPageLabels[normalizedPathname] ?? "หน้าเว็บไซต์";
}
