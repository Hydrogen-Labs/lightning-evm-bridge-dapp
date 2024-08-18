/*
  Warnings:

  - Made the column `amount` on table `Transaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contractId` on table `Transaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hashLockTimestamp` on table `Transaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lnInvoice` on table `Transaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userAddress` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "contractId" SET NOT NULL,
ALTER COLUMN "hashLockTimestamp" SET NOT NULL,
ALTER COLUMN "lnInvoice" SET NOT NULL,
ALTER COLUMN "userAddress" SET NOT NULL;
