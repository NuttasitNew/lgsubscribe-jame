CREATE TABLE IF NOT EXISTS "WebPageView" (
  "eventId" UUID NOT NULL,
  "visitorHash" VARCHAR(64) NOT NULL,
  "path" VARCHAR(500) NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebPageView_pkey" PRIMARY KEY ("eventId")
);
CREATE INDEX IF NOT EXISTS "WebPageView_occurredAt_visitorHash_idx" ON "WebPageView"("occurredAt", "visitorHash");
CREATE TABLE IF NOT EXISTS "BackofficeLoginAttempt" (
  "key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackofficeLoginAttempt_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "BackofficeLoginAttempt_expiresAt_idx" ON "BackofficeLoginAttempt"("expiresAt");
