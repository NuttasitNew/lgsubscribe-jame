import { siteConfig } from "@/lib/site";

/**
 * นโยบายแหล่งอ้างอิงของบทความ — ลิงก์ออกได้เฉพาะเว็บทางการของ LG (lg.com) และเว็บเราเอง
 *
 * ตัวแทน LG Subscribe เจ้าอื่นทุกเจ้าคือคู่แข่ง (เช่น lgsubscribeofficial.com, lgdealer.com) ห้ามลิงก์/อ้างถึง
 * เว็บแบรนด์อื่นก็ไม่ลิงก์ — ใช้เป็นข้อมูลประกอบตารางเทียบได้ แต่ไม่ส่งคนอ่านออกไปหน้าคู่แข่ง
 */
const OWN_HOST = hostOf(siteConfig.url);

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** lg.com (ทุก subdomain) */
export const isOfficialLgUrl = (url: string | null | undefined): boolean => {
  const host = url ? hostOf(url) : null;
  return host === "lg.com" || Boolean(host?.endsWith(".lg.com"));
};

/** ลิงก์ที่อนุญาตในบทความ: path ภายใน (/faq/), เว็บเรา, lg.com */
export const isAllowedArticleLink = (url: string | null | undefined): boolean => {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  return isOfficialLgUrl(url) || (OWN_HOST != null && hostOf(url) === OWN_HOST);
};

/**
 * เว็บที่มีคำว่า lg แต่ไม่ใช่ lg.com/เว็บเรา = ตัวแทน LG เจ้าอื่น (คู่แข่งตรง) — ห้ามใช้เป็นแหล่งข้อมูลเลย
 * เพราะข้อมูลเงื่อนไข/ราคาของเขาอาจเป็นโปรของร้านนั้น ไม่ใช่ของ LG
 */
export const isCompetingLgDealerUrl = (url: string | null | undefined): boolean => {
  const host = url ? hostOf(url) : null;
  if (!host || isAllowedArticleLink(url)) return false;
  return /(^|[.-])lg|lg(subscribe|dealer|shop|thai)/.test(host);
};

/**
 * ตัดลิงก์ที่ไม่อนุญาตออกจากบล็อกบทความ (ข้อความยังอยู่ แค่ไม่เป็นลิงก์) — ตาข่ายรับท้ายหลัง AI เขียน
 * @returns บล็อกใหม่ + รายชื่อโดเมนที่ถูกตัด (ใช้ทำคำเตือนให้คนรีวิว)
 */
export const stripDisallowedLinks = <T>(value: T): { value: T; removedHosts: string[] } => {
  const removed = new Set<string>();
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const entries = Object.entries(node as Record<string, unknown>).flatMap(([key, child]) => {
      if (key === "link" && typeof child === "string" && !isAllowedArticleLink(child)) {
        removed.add(hostOf(child) ?? child);
        return [];
      }
      return [[key, walk(child)] as const];
    });
    return Object.fromEntries(entries);
  };
  return { value: walk(value) as T, removedHosts: [...removed] };
};
