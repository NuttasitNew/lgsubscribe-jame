CREATE TABLE "BackofficeUser" (
 "id" UUID NOT NULL,
 "username" VARCHAR(80) NOT NULL,
 "displayName" VARCHAR(150) NOT NULL,
 "passwordHash" VARCHAR(200) NOT NULL,
 "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "isActive" BOOLEAN NOT NULL DEFAULT true,
 "isOwner" BOOLEAN NOT NULL DEFAULT false,
 "sessionVersion" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "BackofficeUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BackofficeUser_username_key" ON "BackofficeUser"("username");
CREATE TABLE "BackofficeUserAudit" (
 "id" UUID NOT NULL,
 "actorId" UUID NOT NULL,
 "targetId" UUID NOT NULL,
 "action" VARCHAR(30) NOT NULL,
 "changes" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BackofficeUserAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackofficeUserAudit_targetId_createdAt_idx" ON "BackofficeUserAudit"("targetId", "createdAt");
