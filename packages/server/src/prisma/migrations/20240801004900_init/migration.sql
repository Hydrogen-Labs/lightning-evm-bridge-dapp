/*
  Warnings:

  - A unique constraint covering the columns `[contractId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Transaction_txHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_contractId_key" ON "Transaction"("contractId");
