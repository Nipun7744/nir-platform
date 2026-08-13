-- CreateTable
CREATE TABLE "InnovationReferral" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "referredById" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InnovationReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InnovationReferral_innovationId_idx" ON "InnovationReferral"("innovationId");

-- CreateIndex
CREATE INDEX "InnovationReferral_investorId_idx" ON "InnovationReferral"("investorId");

-- CreateIndex
CREATE UNIQUE INDEX "InnovationReferral_innovationId_investorId_key" ON "InnovationReferral"("innovationId", "investorId");

-- AddForeignKey
ALTER TABLE "InnovationReferral" ADD CONSTRAINT "InnovationReferral_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationReferral" ADD CONSTRAINT "InnovationReferral_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InnovationReferral" ADD CONSTRAINT "InnovationReferral_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
