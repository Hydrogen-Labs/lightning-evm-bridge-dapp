-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEIVED', 'SENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED', 'REFUNDED', 'RELAYED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "hashLockTimestamp" INTEGER NOT NULL,
    "lnInvoice" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
