-- AlterTable
ALTER TABLE "Document" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'other';
ALTER TABLE "Document" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Document" ADD COLUMN "isLatest" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Document" ADD COLUMN "rootDocumentId" TEXT;

-- CreateIndex
CREATE INDEX "Document_caseId_idx" ON "Document"("caseId");
CREATE INDEX "Document_category_idx" ON "Document"("category");
CREATE INDEX "Document_rootDocumentId_idx" ON "Document"("rootDocumentId");
CREATE INDEX "Document_isLatest_idx" ON "Document"("isLatest");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_rootDocumentId_fkey" FOREIGN KEY ("rootDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
