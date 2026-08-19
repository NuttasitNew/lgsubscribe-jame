-- CreateEnum
CREATE TYPE "LineWebhookStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "LineUser" (
    "userLineId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "pictureUrl" TEXT,
    "statusMessage" TEXT,
    "language" TEXT,
    "isFollowing" BOOLEAN NOT NULL DEFAULT true,
    "followedAt" TIMESTAMP(3),
    "unfollowedAt" TIMESTAMP(3),
    "profileSyncedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineUser_pkey" PRIMARY KEY ("userLineId")
);

-- CreateTable
CREATE TABLE "LineWebhookEvent" (
    "id" TEXT NOT NULL,
    "webhookEventId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "status" "LineWebhookStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineMessage" (
    "lineMessageId" TEXT NOT NULL,
    "webhookEventId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUserId" TEXT,
    "sourceGroupId" TEXT,
    "sourceRoomId" TEXT,
    "replyToken" TEXT,
    "text" TEXT,
    "messageData" JSONB NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "isRedelivery" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineMessage_pkey" PRIMARY KEY ("lineMessageId")
);

-- CreateTable
CREATE TABLE "LineChatThread" (
    "threadKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "lineUserId" TEXT,
    "groupId" TEXT,
    "roomId" TEXT,
    "lastMessageId" TEXT,
    "lastMessageText" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineChatThread_pkey" PRIMARY KEY ("threadKey")
);

-- CreateTable
CREATE TABLE "LineDailyActivity" (
    "id" TEXT NOT NULL,
    "activityDate" DATE NOT NULL,
    "userLineId" TEXT NOT NULL,
    "firstEventType" TEXT NOT NULL,
    "lastEventType" TEXT NOT NULL,
    "firstEventAt" TIMESTAMP(3) NOT NULL,
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineDailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineUser_isFollowing_idx" ON "LineUser"("isFollowing");

-- CreateIndex
CREATE INDEX "LineUser_lastSeenAt_idx" ON "LineUser"("lastSeenAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LineWebhookEvent_webhookEventId_key" ON "LineWebhookEvent"("webhookEventId");

-- CreateIndex
CREATE INDEX "LineWebhookEvent_status_updatedAt_idx" ON "LineWebhookEvent"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "LineWebhookEvent_eventType_timestamp_idx" ON "LineWebhookEvent"("eventType", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LineMessage_webhookEventId_key" ON "LineMessage"("webhookEventId");

-- CreateIndex
CREATE INDEX "LineMessage_sourceUserId_timestamp_idx" ON "LineMessage"("sourceUserId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "LineMessage_sourceGroupId_timestamp_idx" ON "LineMessage"("sourceGroupId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "LineMessage_messageType_timestamp_idx" ON "LineMessage"("messageType", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "LineChatThread_lastMessageAt_idx" ON "LineChatThread"("lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "LineChatThread_lineUserId_idx" ON "LineChatThread"("lineUserId");

-- CreateIndex
CREATE INDEX "LineDailyActivity_activityDate_idx" ON "LineDailyActivity"("activityDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LineDailyActivity_activityDate_userLineId_key" ON "LineDailyActivity"("activityDate", "userLineId");

-- AddForeignKey
ALTER TABLE "LineMessage" ADD CONSTRAINT "LineMessage_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "LineWebhookEvent"("webhookEventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineMessage" ADD CONSTRAINT "LineMessage_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "LineUser"("userLineId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineChatThread" ADD CONSTRAINT "LineChatThread_lineUserId_fkey" FOREIGN KEY ("lineUserId") REFERENCES "LineUser"("userLineId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineDailyActivity" ADD CONSTRAINT "LineDailyActivity_userLineId_fkey" FOREIGN KEY ("userLineId") REFERENCES "LineUser"("userLineId") ON DELETE CASCADE ON UPDATE CASCADE;
