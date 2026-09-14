import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const environment =
  process.env.APP_ENV ?? (process.env.VERCEL_ENV === "production" ? "production" : "development");
if (!["development", "production"].includes(environment))
  throw new Error("APP_ENV must be development or production");
loadEnv({ path: `.env.${environment}.local`, quiet: true });
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });
if (process.env.DATABASE_ENV !== environment) {
  throw new Error("DATABASE_ENV must match APP_ENV before running Prisma commands");
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
