import { deployedContracts, ServerStatus } from '@lightning-evm-bridge/shared';
import { ethers } from 'ethers';
import logger from '../logger';

const { RPC_URL, LSP_PRIVATE_KEY, CHAIN_ID } = process.env;

if (!RPC_URL || !LSP_PRIVATE_KEY || !CHAIN_ID) {
	logger.error('Missing environment variables for provider and signer initialization');
	process.exit(1);
}

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(LSP_PRIVATE_KEY, provider);
const htlcContractInfo = deployedContracts[CHAIN_ID]?.HashedTimelock;
const htlcContract = new ethers.Contract(htlcContractInfo.address, htlcContractInfo.abi, signer);
const serverStatus: ServerStatus = process.env.LND_MACAROON ? ServerStatus.ACTIVE : ServerStatus.MOCK;

// Fetch the signer's balance in wei and return it as a BigInt
export async function getSignerBalance() {
	try {
		// Fetch the balance in wei
		const balanceWei = await provider.getBalance(signer.address);
		// Convert to BigInt
		const signerBalance = BigInt(balanceWei.toString());

		// Convert to Ether and log the balance
		const signerBalanceInEther = ethers.formatEther(signerBalance);
		logger.info(`Signer's balance: ${signerBalanceInEther} ETH`);

		// Check if the balance is greater or equal to 0.1 ether
		const isSignerBalanceActive = signerBalance >= BigInt(1e17);
		logger.info(`Signer's active: ${isSignerBalanceActive}`);

		return {
			signerBalance,
			signerBalanceInEther,
			isSignerBalanceActive,
		};
	} catch (error) {
		logger.error('Error fetching balance:', error);
		return null;
	}
}

export { htlcContract, provider, serverStatus, signer };
