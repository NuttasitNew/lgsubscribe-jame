-- CreateEnum
CREATE TYPE "SeoArticleStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SeoArticleOrigin" AS ENUM ('CHAT', 'MANUAL', 'CATEGORY', 'LEGACY');

-- CreateEnum
CREATE TYPE "SeoArticleJobType" AS ENUM ('WRITE_CATEGORY', 'WRITE_NOW', 'GENERATE_IMAGES', 'TRANSLATE_EN', 'SINGLE_IMAGE', 'WRITE_FAQ', 'TRANSLATE_FAQ_EN');

-- CreateEnum
CREATE TYPE "SeoArticleJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "SeoArticleImagePlacement" AS ENUM ('COVER', 'INLINE');

-- CreateEnum
CREATE TYPE "SeoArticleImageStyle" AS ENUM ('PHOTO', 'INFOGRAPHIC');

-- CreateEnum
CREATE TYPE "AskAnswerFaqStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiUsageProvider" AS ENUM ('OPENAI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "AiUsageFeature" AS ENUM ('SEO_ARTICLE_WRITE', 'SEO_ARTICLE_TRANSLATE', 'SEO_ARTICLE_IMAGE_BRIEF', 'SEO_ARTICLE_TOPIC', 'SEO_ARTICLE_NORMALIZE', 'ASK_ANSWER_FAQ_WRITE', 'ASK_ANSWER_FAQ_TRANSLATE', 'OTHER');

-- CreateTable
CREATE TABLE "SeoArticle" (
    "seoArticleId" SERIAL NOT NULL,
    "status" "SeoArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "keywords" TEXT[],
    "targetKeyword" TEXT,
    "titleEn" TEXT,
    "metaDescriptionEn" TEXT,
    "keywordsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentEnSourceHash" TEXT,
    "contentJsonEn" JSONB,
    "contentJson" JSONB NOT NULL,
    "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "draftJson" JSONB,
    "draftSavedAt" TIMESTAMP(3),
    "draftSavedBy" TEXT,
    "origin" "SeoArticleOrigin" NOT NULL DEFAULT 'MANUAL',
    "promptBrief" TEXT,
    "sourceDate" TEXT NOT NULL,
    "sourceTopics" JSONB NOT NULL,
    "aiModel" TEXT NOT NULL,
    "approvedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedCommitSha" TEXT,
    "rejectedReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoArticle_pkey" PRIMARY KEY ("seoArticleId")
);

-- CreateTable
CREATE TABLE "SeoArticleJob" (
    "seoArticleJobId" SERIAL NOT NULL,
    "jobType" "SeoArticleJobType" NOT NULL DEFAULT 'WRITE_CATEGORY',
    "status" "SeoArticleJobStatus" NOT NULL DEFAULT 'QUEUED',
    "categoryCode" TEXT,
    "categoryName" TEXT,
    "topic" TEXT NOT NULL,
    "targetKeyword" TEXT,
    "tone" TEXT,
    "generateImages" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "resultJson" JSONB,
    "requestedBy" TEXT NOT NULL,
    "seoArticleId" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoArticleJob_pkey" PRIMARY KEY ("seoArticleJobId")
);

-- CreateTable
CREATE TABLE "SeoSearchQueryDaily" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSearchQueryDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoArticleImage" (
    "seoArticleImageId" SERIAL NOT NULL,
    "seoArticleId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "placement" "SeoArticleImagePlacement" NOT NULL,
    "style" "SeoArticleImageStyle" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoArticleImage_pkey" PRIMARY KEY ("seoArticleImageId")
);

-- CreateTable
CREATE TABLE "SeoKeywordIdea" (
    "seoKeywordIdeaId" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "avgMonthlySearches" INTEGER NOT NULL DEFAULT 0,
    "competition" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
    "competitionIndex" INTEGER,
    "lowTopOfPageBidBaht" DOUBLE PRECISION,
    "highTopOfPageBidBaht" DOUBLE PRECISION,
    "monthlyVolumes" JSONB,
    "categoryCodes" TEXT[],
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoKeywordIdea_pkey" PRIMARY KEY ("seoKeywordIdeaId")
);

-- CreateTable
CREATE TABLE "AskAnswerFaq" (
    "askAnswerFaqId" SERIAL NOT NULL,
    "faqKey" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "questionEn" TEXT,
    "answerEn" TEXT,
    "status" "AskAnswerFaqStatus" NOT NULL DEFAULT 'DRAFT',
    "targetKeyword" TEXT,
    "reason" TEXT,
    "proofNote" TEXT,
    "relatedSlug" TEXT,
    "requestedBy" TEXT NOT NULL,
    "seoArticleJobId" INTEGER,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedCommitSha" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AskAnswerFaq_pkey" PRIMARY KEY ("askAnswerFaqId")
);

-- CreateTable
CREATE TABLE "SeoBrandProfile" (
    "id" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "references" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoBrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" "AiUsageProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "feature" "AiUsageFeature" NOT NULL,
    "operation" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "refId" TEXT,
    "actorName" TEXT,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoArticle_slug_key" ON "SeoArticle"("slug");

-- CreateIndex
CREATE INDEX "SeoArticle_status_createdAt_idx" ON "SeoArticle"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SeoArticle_deletedAt_idx" ON "SeoArticle"("deletedAt");

-- CreateIndex
CREATE INDEX "SeoArticle_sourceDate_origin_idx" ON "SeoArticle"("sourceDate", "origin");

-- CreateIndex
CREATE INDEX "SeoArticleJob_status_createdAt_idx" ON "SeoArticleJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SeoArticleJob_seoArticleId_status_idx" ON "SeoArticleJob"("seoArticleId", "status");

-- CreateIndex
CREATE INDEX "SeoArticleJob_createdAt_idx" ON "SeoArticleJob"("createdAt");

-- CreateIndex
CREATE INDEX "SeoSearchQueryDaily_page_date_idx" ON "SeoSearchQueryDaily"("page", "date");

-- CreateIndex
CREATE INDEX "SeoSearchQueryDaily_query_date_idx" ON "SeoSearchQueryDaily"("query", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SeoSearchQueryDaily_date_page_query_key" ON "SeoSearchQueryDaily"("date", "page", "query");

-- CreateIndex
CREATE INDEX "SeoArticleImage_seoArticleId_createdAt_idx" ON "SeoArticleImage"("seoArticleId", "createdAt");

-- CreateIndex
CREATE INDEX "SeoArticleImage_placement_createdAt_idx" ON "SeoArticleImage"("placement", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeoKeywordIdea_keyword_key" ON "SeoKeywordIdea"("keyword");

-- CreateIndex
CREATE INDEX "SeoKeywordIdea_avgMonthlySearches_idx" ON "SeoKeywordIdea"("avgMonthlySearches" DESC);

-- CreateIndex
CREATE INDEX "SeoKeywordIdea_syncedAt_idx" ON "SeoKeywordIdea"("syncedAt");

-- CreateIndex
CREATE INDEX "SeoKeywordIdea_categoryCodes_idx" ON "SeoKeywordIdea" USING GIN ("categoryCodes");

-- CreateIndex
CREATE UNIQUE INDEX "AskAnswerFaq_faqKey_key" ON "AskAnswerFaq"("faqKey");

-- CreateIndex
CREATE INDEX "AskAnswerFaq_status_createdAt_idx" ON "AskAnswerFaq"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_feature_createdAt_idx" ON "AiUsageLog"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_provider_createdAt_idx" ON "AiUsageLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_model_createdAt_idx" ON "AiUsageLog"("model", "createdAt");

-- AddForeignKey
ALTER TABLE "SeoArticleImage" ADD CONSTRAINT "SeoArticleImage_seoArticleId_fkey" FOREIGN KEY ("seoArticleId") REFERENCES "SeoArticle"("seoArticleId") ON DELETE CASCADE ON UPDATE CASCADE;

