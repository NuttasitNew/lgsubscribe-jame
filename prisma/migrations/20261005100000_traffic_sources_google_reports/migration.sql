ALTER TABLE "WebPageView"
  ADD COLUMN "eventType" VARCHAR(20) NOT NULL DEFAULT 'page_view',
  ADD COLUMN "contactMethod" VARCHAR(10),
  ADD COLUMN "sessionHash" VARCHAR(64),
  ADD COLUMN "source" VARCHAR(150) NOT NULL DEFAULT 'unknown',
  ADD COLUMN "medium" VARCHAR(50) NOT NULL DEFAULT 'unknown',
  ADD COLUMN "channel" VARCHAR(30) NOT NULL DEFAULT 'unknown',
  ADD COLUMN "campaign" VARCHAR(150),
  ADD COLUMN "attributionMethod" VARCHAR(20) NOT NULL DEFAULT 'unknown',
  ADD COLUMN "referrerHost" VARCHAR(253),
  ADD COLUMN "clickIdHash" VARCHAR(64),
  ADD COLUMN "device" VARCHAR(10) NOT NULL DEFAULT 'unknown',
  ADD COLUMN "country" VARCHAR(2);
CREATE TABLE "GoogleDailySnapshot" (
  "id" TEXT NOT NULL,
  "provider" VARCHAR(20) NOT NULL,
  "externalId" VARCHAR(20) NOT NULL,
  "day" DATE NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "timeZone" VARCHAR(50) NOT NULL,
  "quality" VARCHAR(20) NOT NULL DEFAULT 'reported',
  "asOf" TIMESTAMP(3) NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rows" JSONB NOT NULL,
  CONSTRAINT "GoogleDailySnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleDailySnapshot_provider_externalId_day_key" ON "GoogleDailySnapshot"("provider", "externalId", "day");
CREATE INDEX "GoogleDailySnapshot_provider_day_idx" ON "GoogleDailySnapshot"("provider", "day");
