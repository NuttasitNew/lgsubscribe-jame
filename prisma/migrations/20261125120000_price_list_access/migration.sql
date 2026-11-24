CREATE TABLE "PriceListAccessCode" (
 "code" VARCHAR(32) NOT NULL,
 "label" VARCHAR(120),
 "isActive" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PriceListAccessCode_pkey" PRIMARY KEY ("code")
);
CREATE TABLE "PriceListAccessLog" (
 "id" UUID NOT NULL,
 "code" VARCHAR(32) NOT NULL,
 "kind" VARCHAR(10) NOT NULL,
 "userAgent" VARCHAR(300),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PriceListAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PriceListAccessLog_code_createdAt_idx" ON "PriceListAccessLog"("code", "createdAt");
CREATE INDEX "PriceListAccessLog_createdAt_idx" ON "PriceListAccessLog"("createdAt");
ALTER TABLE "PriceListAccessLog" ADD CONSTRAINT "PriceListAccessLog_code_fkey" FOREIGN KEY ("code") REFERENCES "PriceListAccessCode"("code") ON DELETE CASCADE ON UPDATE CASCADE;
