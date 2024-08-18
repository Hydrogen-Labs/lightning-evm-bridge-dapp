/*
  Warnings:

  - Added the required column `totalUnsettledBalance` to the `ChannelBalance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChannelBalance" ADD COLUMN     "totalUnsettledBalance" INTEGER NOT NULL;
