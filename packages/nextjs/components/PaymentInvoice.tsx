import React from "react";
import { Transaction } from "@lightning-evm-bridge/shared";
import { useLightningApp } from "~~/hooks/LightningProvider";
import { LnPaymentInvoice } from "~~/types/utils";

type PaymentInvoiceProps = {
  invoice: LnPaymentInvoice;
  contractId: string | null;
  expiryDate: string;
  submitPayment: () => void;
  cancelPayment: () => void;
  step: number;
  balance: number | null;
  transactionsHT: Transaction[];
};

export const steps = [
  { title: "Verify Invoice", description: "Verify the invoice is correct" },
  { title: "Pay deposit", description: "On-chain invoice locked in smart contract" },
  {
    title: "Waiting to be included in a block",
    description: "The invoice id is sent and verified by the lightning provider",
  },
  { title: "Paid", description: "The lightning provider pays lightning invoice. The reciever must be online." },
];

export const PaymentInvoice = ({
  invoice,
  submitPayment,
  cancelPayment,
  step,
  balance,
  transactionsHT,
}: PaymentInvoiceProps) => {
  const expiryDate = new Date(invoice.timeExpireDate * 1000);
  const { price, signerActive } = useLightningApp();

  // Check if the invoice has already been paid
  const isPaid = transactionsHT.some(transaction => transaction.lnInvoice === invoice.lnInvoice);

  // Format to satoshis
  const satoshiBalance = (balance ?? 0) * 100_000_000;

  // Calculate USD value of the invoice
  const formatBTCBalance = (sats: number) => {
    // Calculate the balance in sats
    const balanceInSats = sats;

    // Calculate the BTC value with the sats
    const btcValue = balanceInSats / 100000000;

    // Calculate the USD value with the sats
    const fiatValue = btcValue * price;

    const formattedBalance = fiatValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `$${formattedBalance}`;
  };

  // Assuming steps is an array of step objects used in your Stepper

  return (
    <div className="flex h-full flex-col justify-evenly content-evenly gap-5">
      <table className="w-full text-white text-sm">
        <tbody>
          <tr>
            <td className="border-transparent">Expiry Time</td>
            <td className="border-transparent text-right">{expiryDate.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="border-transparent">Amount</td>
            <td className="border-transparent text-right">{invoice.satoshis} sats</td>
          </tr>
          <tr>
            <td className="border-transparent">USD</td>
            <td className="border-transparent text-right">{formatBTCBalance(invoice.satoshis)}</td>
          </tr>
          <tr>
            <td className="border-transparent">Service Fee</td>
            <td className="border-transparent text-right">0 sats</td>
          </tr>
        </tbody>
      </table>

      {/* Stepper Component */}
      <ul className="steps steps-vertical">
        {steps.map((stepInfo, index) => (
          <li key={index} className={`${index < step ? "step step-primary" : "step"} text-gray-400`}>
            <div className="flex flex-col text-start">
              {stepInfo.title}
              &nbsp;
              {step === index && <span className="loading loading-dots"></span>}
            </div>
          </li>
        ))}
      </ul>

      {/* Buttons */}
      {step < 2 ? (
        <div className="w-full flex justify-between">
          <button
            className={`btn btn-outline btn-error w-2/5 text-white ${
              step !== 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => cancelPayment()}
            disabled={step == 2 || step == 3}
          >
            Cancel
          </button>
          {isPaid ? (
            <button className="btn btn-error w-2/5 text-white" disabled={true}>
              Already Paid
            </button>
          ) : satoshiBalance >= invoice.satoshis ? (
            <button
              className={`btn btn-success bg-emerald-700 w-2/5 text-white ${
                step !== 1 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => submitPayment()}
              disabled={step == 2 || step == 3 || !signerActive}
            >
              Pay
            </button>
          ) : (
            <button className="btn btn-error w-2/5 text-white" disabled={true}>
              Insufficient Balance
            </button>
          )}
        </div>
      ) : (
        <button
          className="btn btn-neutral  w-full text-white "
          onClick={() => cancelPayment()}
          disabled={step == 2 || step == 3}
        >
          Close
        </button>
      )}
    </div>
  );
};
