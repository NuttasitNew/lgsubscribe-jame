import type { BrandReference } from "../type/brand-profile.type";

/**
 * @description เลือกรูปอ้างอิงเฉพาะคน (ช่าง LG) และเครื่องใช้ไฟฟ้า LG ที่คำสั่งวาดระบุจริง
 * @logic ต้องเอ่ยชนิดเครื่องชัดเจนจึงแนบรูปเครื่อง; ภาพฉากไม่ต้องแนบยูนิฟอร์ม
 * @used-by generateAndUploadArticleImage, generateHurryWebImage
 */
export const selectBrandReferenceKinds = (description: string): BrandReference["kind"][] => {
  const kinds: BrandReference["kind"][] = ["style"];
  const hasTechnician = /(ช่าง|พนักงาน|ทีมงาน|technician|staff|worker)/i.test(description);
  const excludesTechnician =
    /(ไม่มี|ไม่เอา|ห้ามมี|ไม่แสดง|ไม่ต้องมี|ไม่ให้มี)\s*(คน|ช่าง|พนักงาน|ทีมงาน)|\b(no|without|do not show)\s+(people|person|technician|staff|worker)/i.test(
      description
    );
  const applianceNames =
    "แอร์|เครื่องปรับอากาศ|เครื่องฟอกอากาศ|เครื่องลดความชื้น|เครื่องล้างจาน|ไมโครเวฟ|ตู้เย็น|สไตล์เลอร์|เครื่องซักผ้า|เครื่องอบผ้า|เครื่องดูดฝุ่น|เครื่องกรองน้ำ|ทีวี|ลำโพง|จอมอนิเตอร์";
  const hasExtractionMachine = new RegExp(
    `(${applianceNames}|air conditioner|air purifier|dehumidifier|dishwasher|refrigerator|fridge|washer|dryer|vacuum|water purifier|television|monitor)`,
    "i"
  ).test(description);
  const excludesExtractionMachine = new RegExp(
    `(ไม่มี|ไม่เอา|ห้ามมี|ไม่แสดง|ไม่ต้องมี|ไม่ให้มี)\\s*(เครื่อง|${applianceNames})|\\b(no|without)\\s+(appliance|machine)`,
    "i"
  ).test(description);

  if (hasTechnician && !excludesTechnician) kinds.push("uniform");
  if (hasExtractionMachine && !excludesExtractionMachine) kinds.push("equipment");
  return kinds;
};
