/*
  Warnings:

  - Added the required column `combinedBalance` to the `ChannelBalance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChannelBalance" ADD COLUMN     "combinedBalance" INTEGER NOT NULL;
