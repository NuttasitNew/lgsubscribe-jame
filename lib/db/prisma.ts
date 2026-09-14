import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  if (process.env.VERCEL_ENV === "production" && process.env.DATABASE_ENV !== "production") {
    throw new Error("Production requires an explicitly configured production database");
  }
  if (process.env.NODE_ENV === "development" && process.env.DATABASE_ENV === "production") {
    throw new Error("Development must not connect to the production database");
  }
  if (process.env.VERCEL_ENV === "preview" && process.env.DATABASE_ENV !== "development") {
    throw new Error("Preview requires an explicitly configured development database");
  }
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
