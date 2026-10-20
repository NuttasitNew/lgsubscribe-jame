import { getBackofficeSession, sameOrigin } from "@/lib/backoffice/auth";
import { canAccess } from "@/lib/backoffice/permissions";
import {
  isIntegrationSecretKey,
  listIntegrationSecretStatus,
  saveIntegrationSecret,
  SecretInputError,
} from "@/lib/settings/integration-secrets";

// Confirms a new access token with LINE before it replaces the working one.
async function verifyLineAccessToken(token: string) {
  const response = await fetch("https://api.line.me/v2/bot/info", {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response) throw new SecretInputError("ติดต่อ LINE เพื่อตรวจ token ไม่ได้ กรุณาลองอีกครั้ง", 502);
  if (response.status === 401 || response.status === 403)
    throw new SecretInputError("LINE ปฏิเสธ access token นี้ กรุณาตรวจว่าคัดลอกครบและยังไม่หมดอายุ");
  if (!response.ok) throw new SecretInputError(`LINE ตอบกลับผิดปกติ (HTTP ${response.status})`, 502);
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new SecretInputError("คำขอไม่ถูกต้อง", 403);
    const actor = await getBackofficeSession();
    if (!actor) throw new SecretInputError("กรุณาเข้าสู่ระบบ", 401);
    if (!canAccess(actor, "line.manage")) throw new SecretInputError("ไม่มีสิทธิ์ตั้งค่า LINE", 403);
    const text = await request.text();
    if (Buffer.byteLength(text) > 4096) throw new SecretInputError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
    let body: { key?: unknown; value?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      throw new SecretInputError("ข้อมูลไม่ถูกต้อง");
    }
    if (!isIntegrationSecretKey(body.key) || !(body.value === null || typeof body.value === "string"))
      throw new SecretInputError("ข้อมูลไม่ถูกต้อง");
    const value = typeof body.value === "string" ? body.value.trim() : null;
    if (value === "") throw new SecretInputError("กรุณากรอกค่า");
    if (value && body.key === "LINE_CHANNEL_ACCESS_TOKEN") await verifyLineAccessToken(value);
    await saveIntegrationSecret(actor, body.key, value);
    return Response.json(
      { secrets: await listIntegrationSecretStatus() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (reason) {
    if (reason instanceof SecretInputError)
      return Response.json({ error: reason.message }, { status: reason.status });
    console.error("LINE settings save failed", reason instanceof Error ? reason.message : reason);
    return Response.json({ error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 503 });
  }
}
