import { getBackofficeSession, sameOrigin } from "./auth";
import { canAccess } from "./permissions";
import { UserInputError } from "./users";
export async function userMutationContext(request: Request) {
  if (!sameOrigin(request)) throw new UserInputError("คำขอไม่ถูกต้อง", 403);
  const actor = await getBackofficeSession();
  if (!actor) throw new UserInputError("กรุณาเข้าสู่ระบบ", 401);
  if (!canAccess(actor, "users.manage")) throw new UserInputError("ไม่มีสิทธิ์จัดการผู้ใช้", 403);
  const text = await request.text();
  if (Buffer.byteLength(text) > 8192) throw new UserInputError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new UserInputError("ข้อมูลไม่ถูกต้อง");
  }
  return { actor, body };
}
export function userMutationError(reason: unknown) {
  if (reason instanceof UserInputError)
    return Response.json({ error: reason.message }, { status: reason.status });
  if (reason && typeof reason === "object" && "code" in reason && reason.code === "P2002")
    return Response.json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" }, { status: 409 });
  return Response.json({ error: "บันทึกผู้ใช้ไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 503 });
}
