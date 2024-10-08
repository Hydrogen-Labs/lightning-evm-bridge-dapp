import create from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { ChainWithAttributes } from "~~/utils/scaffold-eth";

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

type GlobalState = {
  account: string | undefined;
  setAccount: (newAccount: string) => void;
  nativeCurrencyPrice: number;
  setNativeCurrencyPrice: (newNativeCurrencyPriceState: number) => void;
  targetNetwork: ChainWithAttributes;
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => void;
  dbUpdated: boolean;
  setDbUpdated: (updated: boolean) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  account: undefined,
  setAccount: (newAccount: string) => set({ account: newAccount }),
  nativeCurrencyPrice: 0,
  setNativeCurrencyPrice: (newValue: number): void => set(() => ({ nativeCurrencyPrice: newValue })),
  targetNetwork: scaffoldConfig.targetNetworks[0],
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => set(() => ({ targetNetwork: newTargetNetwork })),
  dbUpdated: false,
  setDbUpdated: (updated: boolean) => set(() => ({ dbUpdated: updated })),
}));
