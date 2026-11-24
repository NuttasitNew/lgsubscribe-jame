-- AlterTable
ALTER TABLE "PriceListAccessLog" ADD COLUMN     "email" VARCHAR(254),
ADD COLUMN     "googleName" VARCHAR(120);

-- CreateIndex
CREATE INDEX "PriceListAccessLog_email_idx" ON "PriceListAccessLog"("email");
