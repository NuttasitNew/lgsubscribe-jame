import { getPrisma } from "@/lib/db/prisma";
import { allPermissions, canAccess, type BackofficeIdentity } from "./permissions";
import { hashPassword } from "./passwords";

export class UserInputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  permissions: true,
  isActive: true,
  isOwner: true,
  createdAt: true,
} as const;
function manager(actor: BackofficeIdentity) {
  if (!canAccess(actor, "users.manage")) throw new UserInputError("ไม่มีสิทธิ์จัดการผู้ใช้", 403);
}
function input(body: unknown, creating: boolean) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new UserInputError("ข้อมูลไม่ถูกต้อง");
  const value = body as Record<string, unknown>;
  const allowed = creating
    ? ["username", "displayName", "password", "permissions"]
    : ["displayName", "password", "permissions", "isActive"];
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new UserInputError("มีช่องข้อมูลที่ไม่รองรับ");
  const username = typeof value.username === "string" ? value.username.trim().toLowerCase() : "";
  if (creating && !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(username))
    throw new UserInputError("ชื่อผู้ใช้ต้องมี 3–80 ตัว เป็น a-z, 0-9, จุด ขีด หรือขีดล่าง");
  if (
    typeof value.displayName !== "string" ||
    !value.displayName.trim() ||
    value.displayName.trim().length > 150
  )
    throw new UserInputError("กรุณาระบุชื่อแสดงผลไม่เกิน 150 ตัวอักษร");
  if (
    !Array.isArray(value.permissions) ||
    value.permissions.some(
      (p) => typeof p !== "string" || !allPermissions.includes(p as (typeof allPermissions)[number]),
    )
  )
    throw new UserInputError("สิทธิ์ที่เลือกไม่ถูกต้อง");
  const permissions = [...new Set(value.permissions as string[])];
  if (permissions.includes("google.manage") && !permissions.includes("google.view"))
    permissions.push("google.view");
  if (value.password !== undefined && typeof value.password !== "string")
    throw new UserInputError("รหัสผ่านไม่ถูกต้อง");
  const password = value.password as string | undefined;
  if ((creating || password) && (!password || password.length < 10 || password.length > 128))
    throw new UserInputError("รหัสผ่านต้องมี 10–128 ตัวอักษร");
  if (!creating && typeof value.isActive !== "boolean") throw new UserInputError("สถานะบัญชีไม่ถูกต้อง");
  return {
    username,
    displayName: value.displayName.trim(),
    permissions,
    password,
    isActive: value.isActive as boolean,
  };
}
export async function createBackofficeUser(actor: BackofficeIdentity, body: unknown) {
  manager(actor);
  const data = input(body, true);
  return getPrisma().$transaction(async (tx) => {
    const user = await tx.backofficeUser.create({
      data: {
        username: data.username,
        displayName: data.displayName,
        permissions: data.permissions,
        passwordHash: hashPassword(data.password!),
      },
      select: publicUserSelect,
    });
    await tx.backofficeUserAudit.create({
      data: {
        actorId: actor.id,
        targetId: user.id,
        action: "create",
        changes: { permissions: user.permissions, isActive: true },
      },
    });
    return user;
  });
}
export async function updateBackofficeUser(actor: BackofficeIdentity, id: string, body: unknown) {
  manager(actor);
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new UserInputError("ไม่พบผู้ใช้", 404);
  const data = input(body, false);
  return getPrisma().$transaction(async (tx) => {
    const target = await tx.backofficeUser.findUnique({ where: { id } });
    if (!target) throw new UserInputError("ไม่พบผู้ใช้", 404);
    if (target.isOwner && target.id !== actor.id)
      throw new UserInputError("บัญชีเจ้าของระบบแก้ไขได้เฉพาะเจ้าของบัญชี", 403);
    if (target.isOwner && !data.isActive) throw new UserInputError("ปิดบัญชีเจ้าของระบบไม่ได้");
    if (
      target.id === actor.id &&
      !target.isOwner &&
      (!data.isActive || !data.permissions.includes("users.manage"))
    )
      throw new UserInputError("ปิดบัญชีหรือนำสิทธิ์จัดการผู้ใช้ของตัวเองออกไม่ได้");
    const permissions = target.isOwner ? [...allPermissions] : data.permissions;
    const user = await tx.backofficeUser.update({
      where: { id },
      data: {
        displayName: data.displayName,
        permissions,
        isActive: data.isActive,
        ...(data.password ? { passwordHash: hashPassword(data.password) } : {}),
        sessionVersion: { increment: 1 },
      },
      select: publicUserSelect,
    });
    await tx.backofficeUserAudit.create({
      data: {
        actorId: actor.id,
        targetId: id,
        action: "update",
        changes: { permissions, isActive: data.isActive, passwordChanged: Boolean(data.password) },
      },
    });
    return user;
  });
}
