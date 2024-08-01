import { type Chain } from "viem";

export const sepoliaTestnet = {
  id: 11155111,
  network: "Sepolia",
  name: "Sepolia Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  testnet: true,
  rpcUrls: {
    default: { http: [`https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`] },
    public: { http: [`https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
} as const satisfies Chain;
