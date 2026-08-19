-- CreateTable
CREATE TABLE "LineUnsentMessage" (
    "lineMessageId" TEXT NOT NULL,
    "unsendWebhookEventId" TEXT NOT NULL,
    "unsentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineUnsentMessage_pkey" PRIMARY KEY ("lineMessageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineUnsentMessage_unsendWebhookEventId_key" ON "LineUnsentMessage"("unsendWebhookEventId");
