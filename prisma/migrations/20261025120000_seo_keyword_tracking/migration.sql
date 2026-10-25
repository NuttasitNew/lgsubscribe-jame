-- CreateEnum
CREATE TYPE "SeoKeywordArticleType" AS ENUM ('GUIDE', 'COMPARE');

-- CreateEnum
CREATE TYPE "SeoKeywordStatus" AS ENUM ('PROPOSED', 'TRACKING', 'DISMISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SeoArticleJobType" ADD VALUE 'RESEARCH_KEYWORDS';
ALTER TYPE "SeoArticleJobType" ADD VALUE 'WRITE_FROM_KEYWORD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AiUsageFeature" ADD VALUE 'SEO_KEYWORD_RESEARCH';
ALTER TYPE "AiUsageFeature" ADD VALUE 'SEO_SERP_ANALYSIS';
ALTER TYPE "AiUsageFeature" ADD VALUE 'SEO_COMPARE_RESEARCH';

-- CreateTable
CREATE TABLE "SeoKeyword" (
    "seoKeywordId" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "persona" TEXT,
    "articleType" "SeoKeywordArticleType" NOT NULL DEFAULT 'GUIDE',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "rationale" TEXT,
    "evidence" JSONB,
    "status" "SeoKeywordStatus" NOT NULL DEFAULT 'PROPOSED',
    "seoArticleId" INTEGER,
    "serpBrief" JSONB,
    "serpAnalyzedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoKeyword_pkey" PRIMARY KEY ("seoKeywordId")
);

-- CreateTable
CREATE TABLE "SeoKeywordRankDaily" (
    "id" BIGSERIAL NOT NULL,
    "seoKeywordId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoKeywordRankDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoKeyword_keyword_key" ON "SeoKeyword"("keyword");

-- CreateIndex
CREATE INDEX "SeoKeyword_status_priority_idx" ON "SeoKeyword"("status", "priority");

-- CreateIndex
CREATE INDEX "SeoKeyword_seoArticleId_idx" ON "SeoKeyword"("seoArticleId");

-- CreateIndex
CREATE INDEX "SeoKeywordRankDaily_date_idx" ON "SeoKeywordRankDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SeoKeywordRankDaily_seoKeywordId_date_key" ON "SeoKeywordRankDaily"("seoKeywordId", "date");

-- AddForeignKey
ALTER TABLE "SeoKeywordRankDaily" ADD CONSTRAINT "SeoKeywordRankDaily_seoKeywordId_fkey" FOREIGN KEY ("seoKeywordId") REFERENCES "SeoKeyword"("seoKeywordId") ON DELETE CASCADE ON UPDATE CASCADE;

