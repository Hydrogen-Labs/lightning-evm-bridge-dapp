/*
  Warnings:

  - Added the required column `requiredBalance` to the `CachedPayment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CachedPayment" ADD COLUMN     "requiredBalance" BIGINT NOT NULL;
