-- AlterTable
ALTER TABLE "LineMessage" ADD COLUMN     "contentUpdatedAt" BIGINT;

-- AlterTable
ALTER TABLE "LineUser" ADD COLUMN     "followStateChangedAt" TIMESTAMP(3);
