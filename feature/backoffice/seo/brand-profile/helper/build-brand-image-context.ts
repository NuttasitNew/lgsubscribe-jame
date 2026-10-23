import type { BrandProfile, BrandReference } from "../type/brand-profile.type";
import type { CompanyImageMode } from "../../preview/type/company-image-mode.type";

/**
 * @description ประกอบคำสั่งและรูปอ้างอิงจาก snapshot ชุดเดียวกัน
 * @logic กรองตามโหมดแล้วจัดเลข Image ให้ตรงลำดับแนบจริง; scene แนบได้เฉพาะ style
 * @used-by generateHurryWebImage, generateAndUploadArticleImage
 */
export const buildBrandImageContext = (
  profile: BrandProfile,
  mode: CompanyImageMode = "auto",
  allowedKinds?: readonly BrandReference["kind"][]
) => {
  const references = profile.references.filter(
    (item) =>
      item.enabled &&
      (allowedKinds === undefined || allowedKinds.includes(item.kind)) &&
      (mode === "scene" ? item.kind === "style" : mode === "team" ? item.kind !== "equipment" : true)
  );
  if ((mode === "team" || mode === "team-equipment") && !references.some((item) => item.kind === "uniform")) {
    throw new Error("กรุณาเปิดใช้รูปยูนิฟอร์มในชุดอ้างอิงบริษัทก่อนเลือกมีทีมงาน");
  }
  if (mode === "team-equipment" && !references.some((item) => item.kind === "equipment")) {
    throw new Error("กรุณาเปิดใช้รูปเครื่องในชุดอ้างอิงบริษัทก่อนเลือกมีเครื่อง");
  }
  return {
    prompt: [
      profile.systemPrompt,
      ...references.map((item, index) => `Image ${index + 1} (${item.kind}, ${item.label}): ${item.description}`),
      "Reference images guide appearance only. Follow the requested scene, service and equipment exactly; never add a referenced person or machine unless the request calls for it. Do not copy reference backgrounds. Customers must not wear staff uniforms.",
    ].join("\n"),
    referenceImageUrls: references.map((item) => item.url),
  };
};
