-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEIVED', 'SENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED', 'REFUNDED', 'RELAYED', 'CACHED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER,
    "txHash" TEXT,
    "contractId" TEXT,
    "secret" TEXT,
    "hashLockTimestamp" INTEGER,
    "lnInvoice" TEXT,
    "userAddress" TEXT,
    "transactionType" "TransactionType",

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelBalance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalLocalBalance" INTEGER NOT NULL,
    "totalRemoteBalance" INTEGER NOT NULL,
    "combinedBalance" INTEGER NOT NULL,

    CONSTRAINT "ChannelBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_contractId_key" ON "Transaction"("contractId");
