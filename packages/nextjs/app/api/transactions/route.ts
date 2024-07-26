import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function POST(req: NextRequest) {
  const { status, date, amount, txHash, contractId, hashLockTimestamp, lnInvoice, userAddress, transactionType } =
    await req.json();

  // Parse date string to a valid Date object
  const dateObject = new Date(date);
  if (isNaN(dateObject.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Convert hashLockTimestamp to a valid Date object
  // const formattedHashLockTimestamp = new Date(hashLockTimestamp * 1000);

  try {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ txHash: txHash }, { contractId: contractId }],
      },
    });

    let newTransaction;
    if (existingTransaction) {
      newTransaction = await prisma.transaction.update({
        where: {
          id: existingTransaction.id,
        },
        data: {
          status,
          date: dateObject,
          amount,
          // hashLockTimestamp: formattedHashLockTimestamp,
          hashLockTimestamp,
          lnInvoice,
          userAddress,
          transactionType,
        },
      });
    } else {
      newTransaction = await prisma.transaction.create({
        data: {
          status,
          date: dateObject,
          amount,
          txHash,
          contractId,
          // hashLockTimestamp: formattedHashLockTimestamp,
          hashLockTimestamp,
          lnInvoice,
          userAddress,
          transactionType,
        },
      });
    }

    console.log("Transaction successfully added/updated in the database:", newTransaction);
    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("Failed to create/update transaction:", error);
    return NextResponse.json({ error: "Failed to create/update transaction" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userAddress = searchParams.get("userAddress"); // Get userAddress from query params

  if (!userAddress) {
    return NextResponse.json({ error: "User address is required" }, { status: 400 });
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userAddress }, // Filter transactions by userAddress
    });
    const reversedTransactions = transactions.reverse(); // Reverse the array
    console.log("Fetched transactions from the database:", reversedTransactions);
    return NextResponse.json(reversedTransactions, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
