import React, { createContext, useContext, useEffect, useState } from "react";
import { useNativeCurrencyPrice, useScaffoldEventSubscriber } from "./scaffold-eth";
import { useWebSocket } from "./useWebSocket";
import {
  ClientRequest,
  HodlInvoiceResponse,
  InitiationResponse,
  InvoiceResponse,
  KIND,
  ServerStatus,
} from "@lightning-evm-bridge/shared";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useGlobalState } from "~~/services/store/store";
import { HashLock } from "~~/types/utils";

// Define the types for your historical transactions and context
export type HistoricalTransaction = {
  status: "pending" | "failed" | "completed" | "refunded" | "relayed";
  date: string;
  amount: number;
  contractId: string;
  txHash: string;
  hashLockTimestamp: number;
  lnInvoice: string;
  userAddress: string;
  transactionType: "RECEIVED" | "SENT";
};

export type LightningAppContextType = {
  transactions: HistoricalTransaction[];
  addTransaction: (transaction: HistoricalTransaction) => void;
  sendMessage: (message: ClientRequest) => void;
  reconnect: () => void;
  isWebSocketConnected: boolean;
  data: InvoiceResponse | null;
  price: number;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
  lspStatus: ServerStatus;
  lnInitationResponse: InitiationResponse | null;
  hodlInvoiceResponse: HodlInvoiceResponse | null;
  hashLock: HashLock | null;
  setHashLock: (hashLock: HashLock) => void;
  recieveContractId: string;
};

// Create the context
const HistoricalTransactionsContext = createContext<LightningAppContextType | undefined>(undefined);

// Provider component
export const LightningProvider = ({ children }: { children: React.ReactNode }) => {
  const { setDbUpdated } = useGlobalState();
  const price = useNativeCurrencyPrice();
  const [hashLock, setHashLock] = useState<HashLock | null>(null);
  const [transactions, setTransactionsState] = useState<HistoricalTransaction[]>([]);
  const transactionRef = React.useRef<HistoricalTransaction[]>([]);
  const [invoiceContractIdPair, setInvoiceContractIdPair] = useState<string[]>([]);
  const setTransactions = (transactions: HistoricalTransaction[]) => {
    transactionRef.current = transactions;
    setTransactionsState(transactions);
  };
  console.log(process.env.WEBSOCKET_URL ?? "ws://localhost:3003");
  const {
    sendMessage,
    isWebSocketConnected,
    data,
    reconnect,
    status,
    lnInitationResponse,
    recieveContractId,
    hodlInvoiceResponse,
  } = useWebSocket(process.env.WEBSOCKET_URL ?? "ws://localhost:3003");

  const toastSuccess = (message: string) => {
    toast.success(message, {
      position: "top-center",
      autoClose: 5000,
      toastId: Date.now().toString(),
    });
  };

  const toastError = (message: string) => {
    toast.error(message, {
      position: "top-center",
      autoClose: 5000,
      toastId: Date.now().toString(),
    });
  };

  useScaffoldEventSubscriber({
    contractName: "HashedTimelock",
    eventName: "LogHTLCNew",
    listener: event => {
      console.log("Event received:", event);
      const tmpContractId = event[0].args.contractId as string;
      const txHash = event[0].transactionHash;
      console.log("Parsed Event Data:", { tmpContractId, txHash });

      if (!tmpContractId) {
        console.log("No contract ID found in event");
        return;
      }

      const index = transactionRef.current.findIndex(t => t.txHash === txHash);
      if (index === -1) {
        console.log("Transaction hash not found in existing transactions");
        return;
      }

      sendMessage({
        contractId: tmpContractId,
        kind: KIND.INVOICE_SEND,
        lnInvoice: transactionRef.current[index]?.lnInvoice,
      });

      setInvoiceContractIdPair([tmpContractId, transactionRef.current[index]?.lnInvoice]);
    },
  });

  useEffect(() => {
    const lastTransaction = transactionRef.current[0];
    if (invoiceContractIdPair.length === 0) return;
    if (lastTransaction === undefined) return;
    const [contractId, lnInvoice] = invoiceContractIdPair;
    addTransaction({
      status: "pending",
      date: lastTransaction.date,
      amount: lastTransaction.amount,
      txHash: lastTransaction.txHash,
      contractId,
      hashLockTimestamp: lastTransaction.hashLockTimestamp,
      lnInvoice,
      userAddress: lastTransaction.userAddress,
      transactionType: lastTransaction.transactionType,
    });
  }, [invoiceContractIdPair]);

  useEffect(() => {
    if (data === null) return;
    const lastTransaction = transactionRef.current[0];
    if (lastTransaction === undefined) return;

    const updatedTransaction: HistoricalTransaction = {
      ...lastTransaction,
      status: data?.status === "success" ? "completed" : ("failed" as "completed" | "failed"),
    };

    addTransaction(updatedTransaction);

    if (data?.status === "success") {
      toastSuccess("Payment successful");
    } else {
      toastError(data.message);
    }
  }, [data]);

  const addTransaction = async (transaction: HistoricalTransaction) => {
    console.log("Adding transaction:", transaction);

    // Ensure the date is correctly formatted and valid
    let validDate;
    try {
      validDate = new Date(transaction.date);
      if (isNaN(validDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch (error) {
      console.error("Invalid date format:", error);
      return;
    }

    // Check that amounts are non-zero
    if (transaction.amount === 0) return;

    // Check if the transaction is already in the list then replace
    let index = transactionRef.current.findIndex(t => t.txHash === transaction.txHash);

    if (index === -1) {
      index = transactionRef.current.findIndex(t => t.contractId === transaction.contractId);
    }

    const updatedTransactions = [...transactionRef.current];
    const updatedTransaction = {
      ...transaction,
      date: validDate.toISOString(), // Ensure date is saved correctly
    };

    if (index !== -1) {
      console.log("Updating existing transaction:", updatedTransaction);
      updatedTransactions[index] = updatedTransaction;
    } else {
      console.log("Adding new transaction:", updatedTransaction);
      updatedTransactions.unshift(updatedTransaction);
    }
    setTransactions(updatedTransactions);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTransaction), // Ensure date and hashLockTimestamp are correctly formatted
      });

      if (!response.ok) {
        throw new Error("Failed to save transaction");
      }
      const result = await response.json();
      console.log("Transaction saved:", result);

      // Set the dbUpdated flag to true
      setDbUpdated(true);
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  return (
    <HistoricalTransactionsContext.Provider
      value={{
        transactions,
        data,
        addTransaction,
        sendMessage,
        isWebSocketConnected,
        price,
        reconnect,
        toastError,
        toastSuccess,
        lspStatus: status,
        lnInitationResponse,
        hodlInvoiceResponse,
        hashLock,
        setHashLock,
        recieveContractId,
      }}
    >
      {children}
      <ToastContainer position="top-center" />
    </HistoricalTransactionsContext.Provider>
  );
};

// Custom hook for using the context
export const useLightningApp = () => {
  const context = useContext(HistoricalTransactionsContext);
  if (context === undefined) {
    throw new Error("useLightningApp must be used within a HistoricalTransactionsProvider");
  }
  return context;
};
