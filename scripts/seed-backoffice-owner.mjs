import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
const username = (process.env.BACKOFFICE_USERNAME || "admin").trim().toLowerCase();
const passwordHash = process.env.BACKOFFICE_PASSWORD_HASH;
if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash || ""))
  throw new Error("Owner password hash is missing");
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL }),
});
try {
  const existing = await prisma.backofficeUser.findUnique({ where: { username } });
  if (existing && !existing.isOwner) throw new Error("Owner username already belongs to another account");
  if (!existing)
    await prisma.backofficeUser.create({
      data: {
        username,
        displayName: "ผู้ดูแลระบบ",
        passwordHash,
        isOwner: true,
        permissions: ["analytics.view", "google.view", "google.manage", "line.view", "users.manage"],
      },
    });
  console.log(
    existing ? "Existing owner preserved" : "Owner account created using the existing password hash",
  );
} finally {
  await prisma.$disconnect();
}
