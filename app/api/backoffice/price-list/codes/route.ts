import { getBackofficeSession, sameOrigin } from "@/lib/backoffice/auth";
import { canAccess } from "@/lib/backoffice/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { normalizeCode } from "@/lib/price-list-access";

async function context(request: Request) {
  if (!sameOrigin(request)) return { error: Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 }) };
  const actor = await getBackofficeSession();
  if (!actor) return { error: Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
  if (!canAccess(actor, "pricelist.manage"))
    return { error: Response.json({ error: "ไม่มีสิทธิ์จัดการรหัส" }, { status: 403 }) };
  const body = await request.json().catch(() => null);
  const code = normalizeCode(body?.code);
  if (!code)
    return {
      error: Response.json({ error: "รหัสต้องเป็น a-z 0-9 _ - ยาว 3–32 ตัว" }, { status: 400 }),
    };
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 120) || null : undefined;
  return { code, label, isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined };
}

/** Add a staff access code for /price-list/. */
export async function POST(request: Request) {
  const input = await context(request);
  if ("error" in input) return input.error;
  try {
    await getPrisma().priceListAccessCode.create({ data: { code: input.code, label: input.label ?? null } });
    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    if (reason && typeof reason === "object" && "code" in reason && reason.code === "P2002")
      return Response.json({ error: "มีรหัสนี้อยู่แล้ว" }, { status: 409 });
    return Response.json({ error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 503 });
  }
}

/** Turn a code on/off or rename its label. Turning off signs that code out on its next page open. */
export async function PATCH(request: Request) {
  const input = await context(request);
  if ("error" in input) return input.error;
  try {
    await getPrisma().priceListAccessCode.update({
      where: { code: input.code },
      data: { isActive: input.isActive, label: input.label },
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 503 });
  }
}
