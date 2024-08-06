import React, { useEffect, useState } from "react";
import { Transaction } from "@lightning-evm-bridge/shared";
import "react-toastify/dist/ReactToastify.css";
import { useWalletClient } from "wagmi";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";

type HistoryTableProps = {
  account: string | null;
  transactionsHT: Transaction[];
  setTransactionsHT: React.Dispatch<React.SetStateAction<Transaction[]>>;
};

export const HistoryTable = ({ account, transactionsHT, setTransactionsHT }: HistoryTableProps) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const { data: walletClient } = useWalletClient();
  const { data: htlcContract } = useScaffoldContract({
    contractName: "HashedTimelock",
    walletClient,
  });

  const toggleRow = (index: number | null) => {
    setExpandedRow(expandedRow === index ? null : index);
    if (index === null) return;

    // if (transactionsHT[index].status === "failed") {
    //   refund(transactionsHT[index]);
    // }
  };

  // refund transaction if status is failed
  const initiateRefund = (index: number) => {
    if (transactionsHT[index].status === "FAILED") {
      refund(transactionsHT[index]);
    }
  };

  function getTooltipText(transaction: Transaction) {
    switch (transaction.status) {
      case "PENDING":
        return "Waiting for the transaction to be included in a block";
      case "COMPLETED":
        return "Expand for more details";
      case "FAILED":
        return `Transaction failed: Redeemable at ${new Date(transaction.hashLockTimestamp * 1000).toLocaleString()}`;
      case "REFUNDED":
        return "Transaction refunded";
      default:
        return "";
    }
  }

  function refund(transaction: Transaction) {
    if (transaction.contractId === "") return;
    if (transaction.hashLockTimestamp > Date.now() / 1000) {
      return;
    }
    if (!htlcContract) return;
    htlcContract.write
      .refund([transaction.contractId as `0x${string}`], {})
      .then(tx => {
        console.log(tx);
        const updatedTransaction: Transaction = { ...transaction, status: "REFUNDED", date: new Date().toISOString() }; // Use ISO string

        // Notify the server about the refund transaction
        fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/transactions/refund`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactionId: transaction.contractId, txHash: tx }),
        })
          .then(response => response.json())
          .then(data => console.log("Server updated:", data))
          .catch(error => console.error("Error updating server:", error));

        setTransactionsHT(prevTransactions =>
          prevTransactions.map(t => (t.txHash === transaction.txHash ? updatedTransaction : t)),
        );
      })
      .catch(e => {
        console.error(e);
      });
  }

  return (
    <div className="flex justify-center mt-16">
      <div className="flex justify-center mx-0 w-full w-[80%] md:w-[100%] flex-col">
        <h2 className="text-center text-xl font-black">HISTORY</h2>
        <div className="mb-0 lg:mb-0 overflow-auto max-h-96">
          <table className="table border-spacing-y-4 mb-0 mt-0 p-0 border-0">
            <thead
              className="border-0 w-full m-0 p-0 bg-neutral z-10"
              style={{
                position: "sticky",
                top: "0",
                left: "0",
                width: "100%",
                // zIndex: "9999",
              }}
            >
              <tr className="text-sm font-extrabold border-0">
                <th className="text-left" style={{ width: "15%" }}>
                  TYPE
                </th>
                <th className="text-left" style={{ width: "15%" }}>
                  STATUS
                </th>
                <th className="text-left" style={{ width: "40%" }}>
                  DATE
                </th>
                <th className="text-right" style={{ width: "30%" }}>
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {transactionsHT.length > 0 ? (
                transactionsHT.map((transaction, index) => (
                  <React.Fragment key={index}>
                    <tr
                      key={transaction.txHash}
                      style={{
                        backgroundColor:
                          transaction.status === "FAILED"
                            ? "rgb(248, 113, 113)"
                            : index % 2 === 0
                            ? "transparent"
                            : "rgba(32, 32, 32, 0.75)",
                      }}
                    >
                      <td className="text-left text-white" style={{ width: "15%" }}>
                        {transaction.transactionType}
                      </td>
                      <td
                        className="text-left table-cell text-white uppercase tooltip flex items-center cursor-pointer"
                        style={{ width: "15%" }}
                        data-tip={getTooltipText(transaction)}
                        onClick={account ? () => toggleRow(index) : undefined}
                      >
                        <div className="flex items-center">
                          {transaction.status}
                          <svg className="ml-2" viewBox="0 0 1024 1024" fill="currentColor" height="1em" width="1em">
                            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" />
                            <path d="M464 336a48 48 0 1096 0 48 48 0 10-96 0zm72 112h-48c-4.4 0-8 3.6-8 8v272c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V456c0-4.4-3.6-8-8-8z" />
                          </svg>
                        </div>
                      </td>
                      <td className="text-left table-cell text-white" style={{ width: "40%" }}>
                        {new Date(transaction.date).toLocaleString()}
                      </td>
                      <td className="text-right table-cell text-white" style={{ width: "30%" }}>
                        {transaction.amount} sats
                      </td>
                    </tr>
                    {expandedRow === index && (
                      <tr key={transaction.contractId}>
                        <td colSpan={4}>
                          <div className="p-2 relative">
                            <div className="flex justify-between items-center">
                              {transaction.transactionType === "SENT" && transaction.status === "FAILED" && (
                                <div>
                                  TimeLock expiry: {new Date(transaction.hashLockTimestamp * 1000).toLocaleString()}
                                </div>
                              )}
                              <button
                                className="btn-neutral absolute right-0 top-1 btn btn-circle btn-sm"
                                onClick={() => toggleRow(null)}
                              >
                                X
                              </button>
                            </div>
                            {transaction.transactionType === "SENT" && <br />}
                            <div className="flex justify-start items-center">
                              <button
                                className="btn btn-neutral text-white text-xs p-2"
                                onClick={() => {
                                  navigator.clipboard.writeText(transaction.txHash);
                                  console.log("Transaction hash copied to clipboard");
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="w-6 h-6"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
                                  />
                                </svg>
                              </button>
                              &nbsp; Transaction Hash: {transaction.txHash.substring(0, 20)}...
                            </div>
                            <br />
                            <div className="flex justify-start items-center">
                              <button
                                className="btn btn-neutral text-white text-xs p-2"
                                onClick={() => {
                                  navigator.clipboard.writeText(transaction.contractId);
                                  console.log("Contract ID copied to clipboard");
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="w-6 h-6"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
                                  />
                                </svg>
                              </button>
                              &nbsp; Contract ID: {transaction.contractId.substring(0, 16)}...
                            </div>
                            <br />
                            {transaction.transactionType === "SENT" && transaction.status === "FAILED" && (
                              <div className="flex justify-between items-center">
                                <button
                                  className={`btn btn-sm ${
                                    transactionsHT[index].status === "FAILED" &&
                                    transactionsHT[index].hashLockTimestamp < Date.now() / 1000
                                      ? "btn-neutral"
                                      : "btn-disabled cursor-not-allowed bg-red-500"
                                  }`}
                                  onClick={account ? () => initiateRefund(index) : undefined}
                                  disabled={
                                    transactionsHT[index].status === "FAILED" &&
                                    transactionsHT[index].hashLockTimestamp < Date.now() / 1000
                                  }
                                >
                                  Initiate Refund
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  {account ? (
                    <td className="text-center py-4" colSpan={5}>
                      No history...go send your first lightning payment!
                    </td>
                  ) : (
                    <td className="text-center py-4" colSpan={5}>
                      Connect your wallet to view transaction history
                    </td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
