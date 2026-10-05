import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  backofficeUser: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  backofficeUserAudit: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => db }));
import { createSession, createUserSession, readBackofficeSession } from "@/lib/backoffice/auth";
import { hashPassword } from "@/lib/backoffice/passwords";
import { allPermissions, allowedPages, canAccess } from "@/lib/backoffice/permissions";
import { createBackofficeUser, updateBackofficeUser } from "@/lib/backoffice/users";
const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
function user() {
  return {
    id,
    username: "reader",
    displayName: "Reader",
    permissions: ["analytics.view"],
    isOwner: false,
    isActive: true,
    sessionVersion: 1,
    passwordHash: hashPassword("some-password-123"),
  };
}
const owner = {
  id: other,
  username: "admin",
  displayName: "Admin",
  permissions: allPermissions,
  isOwner: true,
};
beforeEach(() => {
  vi.stubEnv("BACKOFFICE_SESSION_SECRET", "s".repeat(64));
  db.$transaction.mockImplementation((callback) => callback(db));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("database backoffice identities and permissions", () => {
  it("shows only backoffice routes permitted for each user", () => {
    const reader = user();
    expect(allowedPages(reader).map((p) => p.href)).toEqual(["/backoffice/analytics/"]);
    expect(canAccess(reader, "users.manage")).toBe(false);
    expect(allowedPages(owner)).toHaveLength(6);
    expect(allowedPages({ permissions: [], isOwner: false })).toEqual([]);
  });
  it("binds a 24 hour token to the user, password, active status and current version", async () => {
    const reader = user();
    const now = Date.now();
    const token = createUserSession(reader, now);
    db.backofficeUser.findUnique.mockResolvedValue(reader);
    expect(await readBackofficeSession(token, now)).toMatchObject({ id, permissions: ["analytics.view"] });
    expect(await readBackofficeSession(token, now + 86400000 - 1)).not.toBeNull();
    expect(await readBackofficeSession(token, now + 86400000)).toBeNull();
    expect(await readBackofficeSession(token.replace(id, other), now)).toBeNull();
    db.backofficeUser.findUnique.mockResolvedValue({ ...reader, isActive: false });
    expect(await readBackofficeSession(token, now)).toBeNull();
    db.backofficeUser.findUnique.mockResolvedValue({ ...reader, sessionVersion: 2 });
    expect(await readBackofficeSession(token, now)).toBeNull();
    db.backofficeUser.findUnique.mockResolvedValue({
      ...reader,
      passwordHash: hashPassword("changed-password"),
    });
    expect(await readBackofficeSession(token, now)).toBeNull();
  });
  it("accepts old admin sessions only for the unchanged active database owner", async () => {
    const reader = user();
    vi.stubEnv("BACKOFFICE_PASSWORD_HASH", reader.passwordHash);
    const token = createSession();
    db.backofficeUser.findUnique.mockResolvedValue({ ...reader, isOwner: true });
    expect(await readBackofficeSession(token)).not.toBeNull();
    db.backofficeUser.findUnique.mockResolvedValue(reader);
    expect(await readBackofficeSession(token)).toBeNull();
  });
  it("rejects user management without permission, unknown grants and owner escalation fields", async () => {
    const body = {
      username: "new-reader",
      displayName: "New",
      password: "new-password-123",
      permissions: ["analytics.view"],
    };
    await expect(createBackofficeUser(user(), body)).rejects.toMatchObject({ status: 403 });
    await expect(createBackofficeUser(owner, { ...body, permissions: ["all"] })).rejects.toMatchObject({
      status: 400,
    });
    await expect(createBackofficeUser(owner, { ...body, isOwner: true })).rejects.toMatchObject({
      status: 400,
    });
    expect(db.backofficeUser.create).not.toHaveBeenCalled();
  });
  it("prevents managers resetting owners and locking themselves out", async () => {
    const manager = { ...user(), permissions: ["users.manage"] };
    const body = { displayName: "Changed", permissions: [], isActive: false };
    db.backofficeUser.findUnique.mockResolvedValue({ ...user(), id: other, isOwner: true });
    await expect(updateBackofficeUser(manager, other, body)).rejects.toMatchObject({ status: 403 });
    db.backofficeUser.findUnique.mockResolvedValue(manager);
    await expect(updateBackofficeUser(manager, id, body)).rejects.toMatchObject({ status: 400 });
    expect(db.backofficeUser.update).not.toHaveBeenCalled();
  });
  it("invalidates old sessions on permission edits and audits changes without passwords", async () => {
    db.backofficeUser.findUnique.mockResolvedValue(user());
    db.backofficeUser.update.mockResolvedValue({ ...user(), permissions: ["line.view"] });
    await updateBackofficeUser(owner, id, {
      displayName: "Changed",
      permissions: ["line.view"],
      isActive: true,
      password: "replacement-123",
    });
    expect(db.backofficeUser.update.mock.calls[0][0].data.sessionVersion).toEqual({ increment: 1 });
    const audit = db.backofficeUserAudit.create.mock.calls[0][0].data;
    expect(audit.changes).toEqual({ permissions: ["line.view"], isActive: true, passwordChanged: true });
    expect(JSON.stringify(audit)).not.toContain("replacement-123");
  });
});
