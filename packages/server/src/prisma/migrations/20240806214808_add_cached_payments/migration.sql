-- CreateTable
CREATE TABLE "CachedPayment" (
    "id" SERIAL NOT NULL,
    "contractId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CachedPayment_contractId_key" ON "CachedPayment"("contractId");
