CREATE TABLE "IntegrationSecret" (
 "key" VARCHAR(80) NOT NULL,
 "ciphertext" TEXT NOT NULL,
 "last4" VARCHAR(4) NOT NULL,
 "updatedById" UUID,
 "updatedByName" VARCHAR(150),
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "IntegrationSecret_pkey" PRIMARY KEY ("key")
);
CREATE TABLE "IntegrationSecretAudit" (
 "id" UUID NOT NULL,
 "key" VARCHAR(80) NOT NULL,
 "action" VARCHAR(20) NOT NULL,
 "actorId" UUID NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "IntegrationSecretAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IntegrationSecretAudit_key_createdAt_idx" ON "IntegrationSecretAudit"("key", "createdAt");
