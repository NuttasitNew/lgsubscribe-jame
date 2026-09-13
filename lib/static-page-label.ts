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

export function getStaticPageLabel(pathname: string) {
  return staticPageLabels[normalizePathname(pathname)] ?? "หน้าเว็บไซต์";
}
