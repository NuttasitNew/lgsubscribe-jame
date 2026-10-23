"use client";

import imageCompression from "browser-image-compression";
import { ResponsePattern, ResponsePatternType } from "@/lib/seo/helper/response-pattern";

interface UploadHurryWebImageResult {
  url: string;
  pathname: string;
}

/**
 * @description อัปรูป (เช่น รูปอ้างอิงแบรนด์ / รูปในบทความ) ขึ้น R2 ผ่าน /api/backoffice/seo/upload/
 * @logic บีบเป็น WebP ไม่เกิน 2048px ในเบราว์เซอร์ก่อนส่ง; แปลงไม่ได้จะคืน error โดยไม่อัปต้นฉบับ
 * @param formData field `file` (File) + `pathname` (เช่น "brand-reference/uniform.webp")
 */
export const uploadHurryWebImage = async (
  formData: FormData
): Promise<ResponsePatternType<UploadHurryWebImageResult>> => {
  try {
    const file = formData.get("file");
    const pathname = formData.get("pathname");

    if (!(file instanceof File)) return ResponsePattern.badRequest("ไม่พบไฟล์");
    if (typeof pathname !== "string" || !pathname) return ResponsePattern.badRequest("ขาด pathname");

    // บีบก่อนส่งทั้ง Blob และ R2; ถ้าแปลงไม่ได้ต้องไม่อัปไฟล์ดิบในชื่อ .webp
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 2048,
      initialQuality: 0.82,
      fileType: "image/webp",
      useWebWorker: true,
    });
    if (compressed.type !== "image/webp") throw new Error("เบราว์เซอร์แปลงรูปเป็น WebP ไม่สำเร็จ");
    const webpPathname = pathname.replace(/\.[^/.]+$/, "") + ".webp";

    const uploadForm = new FormData();
    uploadForm.append("file", compressed);
    uploadForm.append("pathname", webpPathname);
    const response = await fetch("/api/backoffice/seo/upload/", { method: "POST", body: uploadForm });
    const payload = (await response.json().catch(() => ({}))) as { url?: string; pathname?: string; error?: string };
    if (!response.ok || !payload.url || !payload.pathname) {
      return ResponsePattern.error(payload.error || "อัพโหลดไม่สำเร็จ");
    }
    return ResponsePattern.ok("อัพโหลดสำเร็จ", { url: payload.url, pathname: payload.pathname });
  } catch (error) {
    return ResponsePattern.error(error instanceof Error ? error.message : "อัพโหลดไม่สำเร็จ");
  }
};
