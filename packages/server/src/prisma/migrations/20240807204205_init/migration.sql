/*
  Warnings:

  - You are about to drop the `CachedPayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'CACHED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "secret" TEXT;

-- DropTable
DROP TABLE "CachedPayment";
