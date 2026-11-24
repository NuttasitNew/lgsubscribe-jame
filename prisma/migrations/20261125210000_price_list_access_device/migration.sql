-- AlterTable
ALTER TABLE "PriceListAccessLog" ADD COLUMN     "city" VARCHAR(80),
ADD COLUMN     "country" VARCHAR(8),
ADD COLUMN     "device" JSONB,
ADD COLUMN     "deviceId" VARCHAR(40),
ADD COLUMN     "ip" VARCHAR(64),
ADD COLUMN     "region" VARCHAR(16);

-- CreateIndex
CREATE INDEX "PriceListAccessLog_deviceId_idx" ON "PriceListAccessLog"("deviceId");
