import bodyParser from 'body-parser'; // Import body-parser
import cors from 'cors'; // Import cors
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import express from 'express'; // Import express
import { v4 as uuidv4 } from 'uuid';
import * as WebSocket from 'ws';
import transactionsRouter from './routes/transactions';

import { ClientRequest, ConnectionResponse, KIND, ServerStatus, deployedContracts } from '@lightning-evm-bridge/shared';
import { TransactionStatus } from '@prisma/client';
import { authenticatedLndGrpc, getChannels } from 'lightning';
import { match } from 'ts-pattern';
import { providerConfig } from './provider.config';
import { CachedPayment, ServerState } from './types/types';
import { updateChannelBalances } from './utils/balanceUtils';
import { handleTxHash } from './utils/handleTxHash';
import { processClientLightningReceiveRequest } from './utils/lightningRecieveUtils';
import { processClientInvoiceRequest } from './utils/lightningSendUtils';
const { PrismaClient } = require('@prisma/client');

dotenv.config();

// Verify environment variables
const { PORT, LND_MACAROON, LND_SOCKET, RPC_URL, LSP_PRIVATE_KEY, CHAIN_ID, LND_TLS_CERT, HTTP_PORT } = process.env;
if (!RPC_URL || !LSP_PRIVATE_KEY || !CHAIN_ID) {
	console.error('Missing environment variables');
	process.exit(1);
}

// Initialize LND gRPC connection
const { lnd } = authenticatedLndGrpc({
	cert: LND_TLS_CERT,
	macaroon: LND_MACAROON,
	socket: LND_SOCKET,
});

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(LSP_PRIVATE_KEY, provider);
const htlcContractInfo = deployedContracts[CHAIN_ID]?.HashedTimelock;
const htlcContract = new ethers.Contract(htlcContractInfo.address, htlcContractInfo.abi, signer);
const serverStatus: ServerStatus = process.env.LND_MACAROON ? ServerStatus.ACTIVE : ServerStatus.MOCK;

// Fetch the signer's balance in wei and return it as a BigInt
async function getSignerBalance() {
	try {
		// Fetch the balance in wei
		const balanceWei = await provider.getBalance(signer.address);
		// Convert to BigInt
		const signerBalance = BigInt(balanceWei.toString());

		// Convert to Ether and log the balance
		const signerBalanceInEther = ethers.formatEther(signerBalance);
		console.log(`Signer's balance: ${signerBalanceInEther} ETH`);

		// Check if the balance is greater or equal to 0.1 ether
		const signerBalanceSolvency = signerBalance >= BigInt(1e17);
		console.log(`Signer's solvency: ${signerBalanceSolvency}`);

		// Return the desired values
		return {
			signerBalance,
			signerBalanceInEther,
			signerBalanceSolvency,
		};
	} catch (error) {
		console.error('Error fetching balance:', error);
		return null; // Handle error scenario
	}
}

async function fetchAndSummarizeBalances() {
	try {
		// Fetch the channels
		const channels = await getChannels({ lnd });
		console.log('Channels:', channels);

		let totalLocalBalance = 0;
		let totalRemoteBalance = 0;

		// Iterate through each channel and sum up the balances
		channels.channels.forEach((channel) => {
			totalLocalBalance += Number(channel.local_balance);
			totalRemoteBalance += Number(channel.remote_balance);
		});

		console.log('Total Local Balance:', totalLocalBalance);
		console.log('Total Remote Balance:', totalRemoteBalance);

		const newCombinedBalance = totalLocalBalance + totalRemoteBalance;
		console.log('New Combined Balance:', newCombinedBalance);

		if (isNaN(newCombinedBalance)) {
			console.error('Combined Balance is not a number:', newCombinedBalance);
			return null;
		}

		const balanceRecords = await prisma.channelBalance.findMany({
			orderBy: { date: 'desc' },
			take: 2,
		});

		if (balanceRecords.length > 0) {
			const lastBalanceRecord = balanceRecords[0];
			const lastCombinedBalance = lastBalanceRecord.combinedBalance;

			if (newCombinedBalance < lastCombinedBalance) {
				console.error('Error: New combined balance is less than the previous combined balance. Potential fund loss.');
				// Handle the error as needed
				return null;
			}
		}

		await prisma.channelBalance.create({
			data: {
				totalLocalBalance,
				totalRemoteBalance,
				combinedBalance: newCombinedBalance,
			},
		});

		if (balanceRecords.length > 1) {
			const oldestBalanceRecordId = balanceRecords[1].id;
			await prisma.channelBalance.delete({
				where: { id: oldestBalanceRecordId },
			});
		}

		return {
			totalLocalBalance,
			totalRemoteBalance,
			combinedBalance: newCombinedBalance,
		};
	} catch (error) {
		console.error('Error fetching or summarizing balances:', error);
		return null;
	}
}

let sockets: { [id: string]: WebSocket } = {};
let cachedPayments: CachedPayment[] = [];
let pendingContracts: string[] = [];
let initialBalances;

// Fetch initial balances at the start
(async () => {
	initialBalances = await fetchAndSummarizeBalances();
	if (initialBalances) {
		console.log(`Initial Total Local Balance: ${initialBalances.totalLocalBalance}`);
		console.log(`Initial Total Remote Balance: ${initialBalances.totalRemoteBalance}`);
		console.log(`Initial Combined Balance: ${initialBalances.combinedBalance}`);
	} else {
		console.log('Failed to fetch initial balances.');
	}
})();

console.log(`RPC Provider is running on ${RPC_URL}`);
console.log(`WebSocket server is running on ws://localhost:${PORT || 3003}`);
console.log(`LSP Address: ${signer.address}`);

const serverState: ServerState = {
	lnd,
	htlcContract,
	cachedPayments,
	pendingContracts,
	serverStatus,
};

// Initialize WebSocket services
const wss = new WebSocket.Server({
	port: Number(PORT) || 3003,
	clientTracking: true,
});

wss.on('connection', async (ws: WebSocket) => {
	console.log('Client connected');

	// Get signer's balance info
	const signerBalanceInfo = await getSignerBalance();
	if (signerBalanceInfo) {
		console.log('signerBalanceInfo', signerBalanceInfo);
	} else {
		console.log('Failed to fetch balance.');
	}

	const uuid = uuidv4();
	sockets[uuid] = ws;

	const connectionResponse: ConnectionResponse = {
		serverStatus: serverState.serverStatus,
		serverConfig: providerConfig,
		uuid,
		message: 'Connected to server',
		signerSolvency: signerBalanceInfo.signerBalanceSolvency,
	};

	ws.send(JSON.stringify(connectionResponse));

	ws.on('message', async (message: string) => {
		console.log('Received message:', message);
		const request: ClientRequest = JSON.parse(message);

		match(request)
			.with({ kind: KIND.INVOICE_SEND }, async (request) => {
				await processClientInvoiceRequest(request, ws, serverState);
			})
			.with({ kind: KIND.INITIATION_RECIEVE }, async (request) => {
				await processClientLightningReceiveRequest(request, ws, serverState);
			})
			.with({ kind: KIND.TX_HASH }, async (request) => {
				await handleTxHash(request, serverState);
			})
			.otherwise((request) => {
				console.warn('Unknown message kind:', request.kind);
			});
	});

	ws.on('close', () => console.log('Client disconnected'));

	// Poll every 30 seconds to process cached payments
	setInterval(() => processCachedPayments(ws), 30000);
});

const prisma = new PrismaClient();

async function processCachedPayments(ws: WebSocket) {
	try {
		const cachedPayments = await prisma.transaction.findMany({
			where: {
				status: 'CACHED',
			},
		});

		if (cachedPayments.length === 0) {
			console.log('No cached payments to process.');
			return;
		}
		console.log(`Processing ${cachedPayments.length} cached payments...`);

		// Get signer's balance
		const signerBalance = await getSignerBalance();
		console.log(`Signer's balance: ${signerBalance.toString()} wei`);

		for (const payment of cachedPayments) {
			try {
				console.log(`Attempting to withdraw for contractId: ${payment.contractId}`);
				await htlcContract
					.withdraw(payment.contractId, '0x' + payment.secret)
					.then(async (tx) => {
						console.log('Withdrawal Transaction Success:', tx);

						await prisma.transaction.update({
							where: { contractId: payment.contractId },
							data: {
								status: TransactionStatus.COMPLETED,
								date: new Date().toISOString(),
							},
						});
						// Update the channel balances after processing the invoice
						await updateChannelBalances(serverState.lnd);
						console.log(`Successfully processed cached payment for contractId: ${payment.contractId}`);
						ws.send(JSON.stringify({ status: 'success', message: 'Invoice withdrawn successfully.' }));
					})
					.catch((error) => {
						console.error(`Error with withdrawal for contractId ${payment.contractId}:`, error);
						// Handle retry logic or other actions as needed
					});
			} catch (error) {
				console.error(`Error processing cached payment for contractId ${payment.contractId}:`, error);
			}
		}
	} catch (error) {
		console.error('Error fetching cached payments:', error);
	}
}

// Express HTTP server setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Placeholder route to verify HTTP server is running
app.get('/', (req, res) => {
	res.send('HTTP server is running!');
});

// Correct usage of the transactions router
app.use('/api/transactions', transactionsRouter);

// Start HTTP server
app.listen(Number(HTTP_PORT) || 3002, () => {
	console.log(`HTTP server is running on http://localhost:${HTTP_PORT || 3002}`);
});
