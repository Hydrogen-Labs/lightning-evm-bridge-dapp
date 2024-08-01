import { deployedContracts } from '@lightning-evm-bridge/shared';
import { ethers } from 'ethers';

export function getContractInstance() {
	// Verify necessary environment variables
	const { RPC_URL, LSP_PRIVATE_KEY, CHAIN_ID } = process.env;
	if (!RPC_URL || !LSP_PRIVATE_KEY || !CHAIN_ID) {
		throw new Error('Missing necessary environment variables for contract instantiation');
	}

	// Initialize provider and signer
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const signer = new ethers.Wallet(LSP_PRIVATE_KEY, provider);

	// Retrieve contract info from deployed contracts
	const htlcContractInfo = deployedContracts[CHAIN_ID]?.HashedTimelock;
	if (!htlcContractInfo) {
		throw new Error(`No deployed contract found for CHAIN_ID: ${CHAIN_ID}`);
	}

	// Create and return the contract instance
	const htlcContract = new ethers.Contract(htlcContractInfo.address, htlcContractInfo.abi, signer);
	return htlcContract;
}
