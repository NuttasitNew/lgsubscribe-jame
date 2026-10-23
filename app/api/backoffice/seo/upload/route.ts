import { getBackofficeSession, sameOrigin } from "@/lib/backoffice/auth";
import { canAccess } from "@/lib/backoffice/permissions";
import { uploadMediaToKey } from "@/lib/r2/media-upload";

const MAX_BYTES = 4 * 1024 * 1024;
// Folders the SEO editor uploads into; anything else is rejected.
const PATHNAME = /^(blog|blog\/cover|brand-reference)\/[a-zA-Z0-9._-]{1,120}\.webp$/;

// Stores a browser-compressed WebP from the SEO editor in R2 under site/<pathname>.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const actor = await getBackofficeSession();
  if (!actor) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!canAccess(actor, "seo.manage")) return Response.json({ error: "ไม่มีสิทธิ์อัปโหลดรูป" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const pathname = form?.get("pathname");
  if (!(file instanceof File) || typeof pathname !== "string" || !PATHNAME.test(pathname))
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  if (file.type !== "image/webp") return Response.json({ error: "รับเฉพาะไฟล์ WebP" }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "ไฟล์ใหญ่เกิน 4MB" }, { status: 413 });

  const key = `site/${pathname}`;
  const uploaded = await uploadMediaToKey(Buffer.from(await file.arrayBuffer()), key, "image/webp");
  if (!uploaded.success || !uploaded.url) {
    console.error("SEO image upload failed", uploaded.error);
    return Response.json({ error: uploaded.error ?? "อัปโหลดไม่สำเร็จ" }, { status: 503 });
  }
  return Response.json({ url: uploaded.url, pathname }, { headers: { "Cache-Control": "no-store" } });
}
