-- AlterTable
ALTER TABLE "Client" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Case" ADD COLUMN "notes" TEXT,
ADD COLUMN "courtDate" TIMESTAMP(3);
