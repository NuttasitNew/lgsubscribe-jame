import "server-only";
import type { GenerationSize } from "@/lib/seo/helper/crop-to-ratio";

/**
 * @description เรียก OpenAI Images API (gpt-image-2.5-sunburst) สร้างรูปประกอบบทความ SEO — คืน Buffer (webp)
 *
 * @config env variables:
 * - CHATGPT_API_KEY: OpenAI API key (ใช้ทั้ง prod และ dev)
 *
 * @logic
 * - ไม่มี referenceImageUrls → POST /v1/images/generations
 * - มี referenceImageUrls → POST /v1/images/edits (multipart, ส่ง image[] ได้หลายใบ)
 *   ใช้ล็อกยูนิฟอร์มพนักงาน + เครื่องมือของบริษัทให้ตรงของจริง
 *   ไม่ส่ง input_fidelity — 2.5 รักษา subject จากรูปอ้างอิงได้ดีขึ้นเอง และพารามิเตอร์นี้เคย error บนรุ่นก่อน
 * - ทั้งสองทางคืน b64_json → Buffer, quality "medium"; ค่าใช้จ่ายขึ้นกับขนาดและรูปอ้างอิง
 * - Sunburst เน้นความแม่นยำในการแก้ภาพและยึดรูปอ้างอิง
 * @used-by feature/super-admin/hurry-web/seo-article/server/generate-article-images.helper.ts
 */

const OPENAI_IMAGE_MODEL = "gpt-image-2.5-sunburst";

export interface GenerateImageParams {
  prompt: string;
  /** ขนาดยืดหยุ่นตามข้อจำกัด GPT Image 2.5 */
  size?: GenerationSize;
  quality?: "low" | "medium" | "high" | "xhigh" | "max";
  /** รูปอ้างอิงแบรนด์ (ยูนิฟอร์ม/เครื่องมือ) — มีค่า = ใช้ /v1/images/edits แทน generations */
  referenceImageUrls?: string[];
  /** Prevalidated references supplied by server-side pipelines. */
  referenceImageBlobs?: Blob[];
  signal?: AbortSignal;
}

/** โหลดรูป reference จาก URL → Blob สำหรับแนบเข้า multipart */
const fetchReferenceBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[OAI-IMG-04] โหลดรูปอ้างอิงไม่สำเร็จ: ${res.status} ${url}`);
  return res.blob();
};

/** ตรวจว่าตั้งค่า OpenAI key แล้วหรือยัง — ไม่มี = ข้ามขั้น gen รูปแบบไม่ error */
export const isOpenAiConfigured = (): boolean => Boolean(process.env.CHATGPT_API_KEY);

export const generateImage = async (params: GenerateImageParams): Promise<Buffer> => {
  const apiKey = (process.env.CHATGPT_API_KEY || "").trim();
  if (!apiKey) throw new Error("[OAI-IMG-01] CHATGPT_API_KEY ไม่ถูกตั้งค่า");

  const size = params.size ?? "1536x1024";
  const [width, height] = size.split("x").map(Number);
  if (
    !/^\d+x\d+$/.test(size) ||
    ![width, height].every((edge) => Number.isInteger(edge) && edge > 0 && edge <= 3840 && edge % 16 === 0) ||
    Math.max(width / height, height / width) > 3 ||
    width * height < 655360 ||
    width * height > 8294400
  ) {
    throw new Error("[OAI-IMG-05] ขนาดรูปไม่ตรงข้อกำหนด GPT Image 2.5");
  }
  const quality = params.quality ?? "medium";
  const references = params.referenceImageUrls ?? [];
  const suppliedBlobs = params.referenceImageBlobs ?? [];

  const res =
    references.length || suppliedBlobs.length
      ? await (async () => {
          const form = new FormData();
          form.append("model", OPENAI_IMAGE_MODEL);
          form.append("prompt", params.prompt);
          form.append("size", size);
          form.append("quality", quality);
          form.append("output_format", "webp");
          form.append("n", "1");
          const blobs = [...suppliedBlobs, ...(await Promise.all(references.map(fetchReferenceBlob)))];
          blobs.forEach((blob, i) => form.append("image[]", blob, `reference-${i + 1}.png`));
          return fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            signal: params.signal,
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
          });
        })()
      : await fetch("https://api.openai.com/v1/images/generations", {
          signal: params.signal,
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: OPENAI_IMAGE_MODEL,
            prompt: params.prompt,
            size,
            quality,
            output_format: "webp",
            n: 1,
          }),
        });
  if (!res.ok) {
    throw new Error(`[OAI-IMG-02] สร้างรูปไม่สำเร็จ: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { data: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("[OAI-IMG-03] response ไม่มี b64_json");
  return Buffer.from(b64, "base64");
};
