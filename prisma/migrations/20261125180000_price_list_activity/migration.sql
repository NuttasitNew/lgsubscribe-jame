CREATE TABLE "PriceListActivity" (
 "id" UUID NOT NULL,
 "code" VARCHAR(32) NOT NULL,
 "session" VARCHAR(40) NOT NULL,
 "kind" VARCHAR(20) NOT NULL,
 "detail" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PriceListActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PriceListActivity_session_createdAt_idx" ON "PriceListActivity"("session", "createdAt");
CREATE INDEX "PriceListActivity_createdAt_idx" ON "PriceListActivity"("createdAt");
ALTER TABLE "PriceListActivity" ADD CONSTRAINT "PriceListActivity_code_fkey" FOREIGN KEY ("code") REFERENCES "PriceListAccessCode"("code") ON DELETE CASCADE ON UPDATE CASCADE;
