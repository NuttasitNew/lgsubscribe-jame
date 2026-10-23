"use client";

/**
 * @description Client-side image compression utility — ใช้ browser-image-compression (Web Worker)
 * @logic
 * - Skip compression ถ้ารูป < 100KB (ลด overhead spawn worker)
 * - ใช้ imageCompression() lib → Web Worker → ไม่ block UI thread
 * - WebP output (auto fallback JPEG ถ้า browser ไม่รองรับ)
 * - lib handle EXIF rotation อัตโนมัติ (รูป iPhone ไม่หมุนผิด)
 * - Fallback ถ้า lib throw → return file เดิม + log error
 * - Log ทุก step (start/done/skip/error) → debug ผ่าน DevTools + Vercel Logs
 * @used-by
 * - {@link helper/upload-image-to-blob.ts}
 * - {@link feature/social-chat/line/message-list/components/message-input.tsx}
 */

import imageCompression from "browser-image-compression";

// ===========================================
// Types
// ===========================================

export type CompressImageOptions = {
  /** Max width or height in pixels (default: 1600) */
  maxDimension?: number;
  /** Quality 0-1 (default: 0.82) */
  quality?: number;
  /** Output format — "image/webp" with JPEG fallback (default: "image/webp") */
  outputFormat?: "image/webp" | "image/jpeg";
  /** Trace context for logging — เช่น "today-work:E001", "order-document:5051:front" */
  context?: string;
};

const DEFAULT_OPTIONS: Required<Omit<CompressImageOptions, "context">> = {
  maxDimension: 1600,
  quality: 0.82,
  outputFormat: "image/webp",
};

const SKIP_THRESHOLD_BYTES = 100 * 1024;
const SAFETY_MAX_SIZE_MB = 5;

// ===========================================
// Internal Helpers
// ===========================================

let webpSupported: boolean | null = null;
function isWebPSupported(): boolean {
  if (webpSupported !== null) return webpSupported;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

async function getDimensions(file: File | Blob): Promise<{ w: number; h: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { w: bitmap.width, h: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return { w: 0, h: 0 };
  }
}

const sizeKB = (bytes: number): number => Math.round(bytes / 1024);

// ===========================================
// Public API
// ===========================================

/**
 * Compress a File or Blob — returns a new compressed File
 * @param input File หรือ Blob ที่ต้องการ compress
 * @param options ตั้งค่า maxDimension, quality, outputFormat, context (สำหรับ log)
 * @returns File ที่ถูก compress แล้ว (หรือไฟล์เดิมถ้า skip/error)
 */
export async function compressImageFile(input: File | Blob, options?: CompressImageOptions): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ctx = options?.context ?? "unknown";
  const fileName = input instanceof File ? input.name : "image.jpg";
  const file = input instanceof File ? input : new File([input], fileName, { type: input.type });

  if (file.size < SKIP_THRESHOLD_BYTES) {
    console.log("[compress-image] skip", {
      ctx,
      file: fileName,
      sizeKB: sizeKB(file.size),
      reason: "below 100KB threshold",
    });
    return file;
  }

  const startedAt = performance.now();
  const before = await getDimensions(file);
  const targetFormat = opts.outputFormat === "image/webp" && isWebPSupported() ? "image/webp" : "image/jpeg";

  console.log("[compress-image] start", {
    ctx,
    file: fileName,
    type: file.type,
    sizeKB: sizeKB(file.size),
    opts: { maxDim: opts.maxDimension, q: opts.quality, format: targetFormat },
  });

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: SAFETY_MAX_SIZE_MB,
      maxWidthOrHeight: opts.maxDimension,
      useWebWorker: true,
      fileType: targetFormat,
      initialQuality: opts.quality,
    });

    const ext = targetFormat === "image/webp" ? ".webp" : ".jpg";
    const baseName = fileName.replace(/\.[^.]+$/, "");
    const finalFile = compressed.name.endsWith(ext)
      ? compressed
      : new File([compressed], `${baseName}${ext}`, { type: compressed.type, lastModified: Date.now() });

    const after = await getDimensions(finalFile);
    const ms = Math.round(performance.now() - startedAt);
    const savedPct = file.size > 0 ? Math.round((1 - finalFile.size / file.size) * 100) : 0;

    console.log("[compress-image] done", {
      ctx,
      before: { sizeKB: sizeKB(file.size), w: before.w, h: before.h },
      after: { sizeKB: sizeKB(finalFile.size), w: after.w, h: after.h },
      savedPct,
      ms,
    });

    return finalFile;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[compress-image] error", {
      ctx,
      file: fileName,
      sizeKB: sizeKB(file.size),
      msg,
      fallback: "original file",
    });
    return file;
  }
}

/**
 * Compress จาก base64 data URL — returns a new compressed File
 * @param base64DataUrl base64 data URL (เช่น "data:image/jpeg;base64,...")
 * @param options ตั้งค่า maxDimension, quality, outputFormat, context (สำหรับ log)
 * @returns File ที่ถูก compress แล้ว
 */
export async function compressImageFromBase64(base64DataUrl: string, options?: CompressImageOptions): Promise<File> {
  const [header, base64Data] = base64DataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });

  return compressImageFile(blob, options);
}
