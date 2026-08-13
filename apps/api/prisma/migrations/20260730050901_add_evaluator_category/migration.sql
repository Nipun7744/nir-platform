-- AlterTable
ALTER TABLE "User" ADD COLUMN     "evaluatorCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "User_evaluatorCategoryId_idx" ON "User"("evaluatorCategoryId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_evaluatorCategoryId_fkey" FOREIGN KEY ("evaluatorCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
