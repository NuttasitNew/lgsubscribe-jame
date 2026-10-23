export const permissionOptions = [
  { key: "analytics.view", label: "ดูสถิติผู้เข้าชมเว็บไซต์" },
  { key: "google.view", label: "ดูรายงาน Google Ads / GA4" },
  { key: "google.manage", label: "ตั้งค่าการเชื่อมต่อ Google และดาวน์โหลดสคริปต์" },
  { key: "line.view", label: "ดูภาพรวม ผู้ใช้ และข้อความ LINE" },
  { key: "line.manage", label: "ตั้งค่าการเชื่อมต่อ LINE (Channel secret / Access token)" },
  { key: "seo.manage", label: "เขียน แก้ไข เผยแพร่บทความ SEO / FAQ และดูผลจาก Search Console" },
  { key: "users.manage", label: "สร้างผู้ใช้ ตั้งรหัสผ่าน และจัดการสิทธิ์" },
] as const;
export type Permission = (typeof permissionOptions)[number]["key"];
export const allPermissions: Permission[] = permissionOptions.map(({ key }) => key);
export type BackofficeIdentity = {
  id: string;
  username: string;
  displayName: string;
  permissions: string[];
  isOwner: boolean;
};
export function canAccess(user: Pick<BackofficeIdentity, "permissions" | "isOwner">, permission: Permission) {
  return user.isOwner || user.permissions.includes(permission);
}
export const backofficePages: { href: string; label: string; permission: Permission; group: string }[] = [
  { href: "/backoffice/analytics/", label: "สถิติผู้เข้าชม", permission: "analytics.view", group: "รายงาน" },
  { href: "/backoffice/google/", label: "Google Ads / GA4", permission: "google.view", group: "รายงาน" },
  { href: "/backoffice/line/", label: "ภาพรวม LINE", permission: "line.view", group: "LINE" },
  { href: "/backoffice/line/users/", label: "ผู้ใช้ LINE", permission: "line.view", group: "LINE" },
  { href: "/backoffice/line/messages/", label: "ข้อความ LINE", permission: "line.view", group: "LINE" },
  { href: "/backoffice/line/settings/", label: "ตั้งค่า LINE", permission: "line.manage", group: "LINE" },
  { href: "/backoffice/seo/", label: "บทความ SEO และ FAQ", permission: "seo.manage", group: "SEO" },
  { href: "/backoffice/users/", label: "ผู้ใช้และสิทธิ์", permission: "users.manage", group: "ผู้ดูแลระบบ" },
];
export function allowedPages(user: Pick<BackofficeIdentity, "permissions" | "isOwner">) {
  return backofficePages.filter((page) => canAccess(user, page.permission));
}
