import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function POST(req: NextRequest) {
  const {
    status,
    date,
    amount,
    txHash,
    contractId,
    hashLockTimestamp,
    lnInvoice,
    userAddress, // Include userAddress in the request
  } = await req.json();

  console.log("Received transaction data:", {
    status,
    date,
    amount,
    txHash,
    contractId,
    hashLockTimestamp,
    lnInvoice,
    userAddress, // Log the userAddress
  });

  // Convert date string to a valid Date object
  const [datePart, timePart] = date.split(", ");
  const [day, month, year] = datePart.split("/");
  const formattedDate = `${year}-${month}-${day}T${timePart}`;
  const dateObject = new Date(formattedDate);

  // Convert hashLockTimestamp to a valid Date object
  const formattedHashLockTimestamp = new Date(hashLockTimestamp * 1000);

  try {
    const newTransaction = await prisma.transaction.create({
      data: {
        status,
        date: dateObject,
        amount,
        txHash,
        contractId,
        hashLockTimestamp: formattedHashLockTimestamp,
        lnInvoice,
        userAddress, // Store userAddress
      },
    });

    console.log("Transaction successfully added to the database:", newTransaction);

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
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
    console.log("Fetched transactions from the database:", transactions);
    return NextResponse.json(transactions, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
