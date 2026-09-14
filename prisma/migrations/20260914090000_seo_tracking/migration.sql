-- CreateTable
CREATE TABLE "SeoKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "targetPath" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'P1',
    "country" TEXT NOT NULL DEFAULT 'tha',
    "device" TEXT NOT NULL DEFAULT 'MOBILE',
    "targetRank" INTEGER NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMeasurement" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "clicks" INTEGER,
    "impressions" INTEGER,
    "position" DOUBLE PRECISION,
    "observedPage" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SeoSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackofficeLoginAttempt" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackofficeLoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoKeyword_normalized_country_device_key" ON "SeoKeyword"("normalized", "country", "device");

-- CreateIndex
CREATE INDEX "SeoMeasurement_periodEnd_source_idx" ON "SeoMeasurement"("periodEnd", "source");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeasurement_keywordId_periodStart_periodEnd_source_key" ON "SeoMeasurement"("keywordId", "periodStart", "periodEnd", "source");

-- AddForeignKey
ALTER TABLE "SeoMeasurement" ADD CONSTRAINT "SeoMeasurement_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "SeoKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
