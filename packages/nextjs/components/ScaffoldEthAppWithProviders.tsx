"use client";

import { useEffect } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { Toaster } from "react-hot-toast";
import { WagmiConfig, useAccount } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { ProgressBar } from "~~/components/scaffold-eth/ProgressBar";
import { LightningProvider, useLightningApp } from "~~/hooks/LightningProvider";
import { useGlobalState } from "~~/services/store/store";
import { botanixTestnet } from "~~/services/web3/botanixTestnet";
import { sepoliaTestnet } from "~~/services/web3/sepoliaTestnet";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { appChains } from "~~/services/web3/wagmiConnectors";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  const { price } = useLightningApp();
  const { setAccount, setNativeCurrencyPrice } = useGlobalState();
  const { address } = useAccount();

  useEffect(() => {
    if (price > 0) {
      setNativeCurrencyPrice(price);
    }
  }, [setNativeCurrencyPrice, price]);

  // Update account-related state
  useEffect(() => {
    if (address) {
      setAccount(address);
    } else {
      setAccount("");
    }
  }, [address, setAccount]);

  return (
    <>
      <div className="flex flex-col min-h-screen bg-base-200 font-mono">
        <Header />
        <div className="flex flex-col flex-1 justify-center relative">{children}</div>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiConfig config={wagmiConfig}>
      <ProgressBar />
      <RainbowKitProvider
        // chains={[...appChains.chains, botanixTestnet]}
        chains={[...appChains.chains, sepoliaTestnet]}
        avatar={BlockieAvatar}
      >
        <LightningProvider>
          <ScaffoldEthApp>{children}</ScaffoldEthApp>
        </LightningProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
};
