-- CreateTable
CREATE TABLE "LinePendingMessageEdit" (
    "lineMessageId" TEXT NOT NULL,
    "webhookEventId" TEXT NOT NULL,
    "text" TEXT,
    "messageData" JSONB NOT NULL,
    "editedAt" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinePendingMessageEdit_pkey" PRIMARY KEY ("lineMessageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinePendingMessageEdit_webhookEventId_key" ON "LinePendingMessageEdit"("webhookEventId");
