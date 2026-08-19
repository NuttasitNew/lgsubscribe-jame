import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing POSTGRES_PRISMA_URL or DATABASE_URL");
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    errorFormat: "pretty",
  });
}

/** Returns one lazily-created Prisma client per server process. */
export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}
