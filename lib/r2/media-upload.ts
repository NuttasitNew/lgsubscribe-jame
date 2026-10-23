import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Uploads SEO article images to Cloudflare R2 (bucket `lg-jame-media`, public via r2.dev).
 * Env: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME, R2_PUBLIC_URL.
 * Keys are `<env>/<category>/<yyyy-MM>/<name>-<timestamp>.<ext>` so every upload is a new file
 * and can be cached forever.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

let client: S3Client | null = null;

function r2Client() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: (process.env.R2_ENDPOINT || "").trim(),
      credentials: {
        accessKeyId: (process.env.R2_ACCESS_KEY_ID || "").trim(),
        secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || "").trim(),
      },
    });
  }
  return client;
}

export function r2Configured() {
  return Boolean(
    process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_PUBLIC_URL,
  );
}

/** Uploads to an exact object key (overwrites). Returns the public URL. */
export async function uploadMediaToKey(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!r2Configured()) return { success: false, error: "ยังไม่ได้ตั้งค่า R2 (R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_URL)" };
  try {
    await r2Client().send(
      new PutObjectCommand({
        Bucket: (process.env.R2_BUCKET_NAME || "lg-jame-media").trim(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: CACHE_CONTROL,
      }),
    );
    return { success: true, url: `${process.env.R2_PUBLIC_URL!.trim().replace(/\/$/, "")}/${key}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "upload failed" };
  }
}

export async function uploadMediaBuffer(
  buffer: Buffer,
  options: { filename: string; contentType: string; category: string },
): Promise<{ success: boolean; url?: string; error?: string }> {
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const month = new Date().toISOString().slice(0, 7);
  const dot = options.filename.lastIndexOf(".");
  const base = (dot > 0 ? options.filename.slice(0, dot) : options.filename).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
  const extension = dot > 0 ? options.filename.slice(dot + 1) : (options.contentType.split("/")[1] ?? "bin");
  return uploadMediaToKey(buffer, `${environment}/${options.category}/${month}/${base}-${Date.now()}.${extension}`, options.contentType);
}
