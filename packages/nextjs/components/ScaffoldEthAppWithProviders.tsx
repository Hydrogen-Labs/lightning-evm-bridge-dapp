"use client";

import { useEffect } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { Toaster } from "react-hot-toast";
import { WagmiConfig, useAccount } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { ProgressBar } from "~~/components/scaffold-eth/ProgressBar";
import { LightningProvider, useLightningApp } from "~~/hooks/LightningProvider";
import { useDarkMode } from "~~/hooks/scaffold-eth/useDarkMode";
import { useGlobalState } from "~~/services/store/store";
import { botanixTestnet } from "~~/services/web3/botanixTestnet";
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
      <div className="flex flex-col min-h-screen bg-base-200">
        <Header />
        <div className="flex flex-col flex-1 justify-center relative">{children}</div>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { isDarkMode } = useDarkMode();

  return (
    <WagmiConfig config={wagmiConfig}>
      <ProgressBar />
      <RainbowKitProvider
        chains={[...appChains.chains, botanixTestnet]}
        avatar={BlockieAvatar}
        theme={isDarkMode ? darkTheme() : lightTheme()}
      >
        <LightningProvider>
          <ScaffoldEthApp>{children}</ScaffoldEthApp>
        </LightningProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
};
