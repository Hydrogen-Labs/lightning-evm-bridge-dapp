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
import logger from './logger';
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
	logger.error('Missing environment variables');
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
		logger.info(`Signer's balance: ${signerBalanceInEther} ETH`);

		// Check if the balance is greater or equal to 0.1 ether
		const isSignerBalanceActive = signerBalance >= BigInt(1e17);
		logger.info(`Signer's active: ${isSignerBalanceActive}`);

		// Return the desired values
		return {
			signerBalance,
			signerBalanceInEther,
			isSignerBalanceActive,
		};
	} catch (error) {
		logger.error('Error fetching balance:', error);
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
		let totalUnsettledBalance = 0;

		// Iterate through each channel and sum up the balances
		channels.channels.forEach((channel) => {
			totalLocalBalance += Number(channel.local_balance);
			totalRemoteBalance += Number(channel.remote_balance);
			totalUnsettledBalance += Number(channel.unsettled_balance || 0);
		});

		const newCombinedBalance = totalLocalBalance + totalRemoteBalance + totalUnsettledBalance;

		if (isNaN(newCombinedBalance)) {
			logger.error('Combined Balance is not a number:', newCombinedBalance);
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
				logger.error('Error: New combined balance is less than the previous combined balance. Potential fund loss.');
				// Handle the error as needed
				return null;
			}
		}

		await prisma.channelBalance.create({
			data: {
				totalLocalBalance,
				totalRemoteBalance,
				totalUnsettledBalance,
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
			totalUnsettledBalance,
			combinedBalance: newCombinedBalance,
		};
	} catch (error) {
		logger.error('Error fetching or summarizing balances:', error);
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
		logger.info(`Initial Total Local Balance: ${initialBalances.totalLocalBalance}`);
		logger.info(`Initial Total Remote Balance: ${initialBalances.totalRemoteBalance}`);
		logger.info(`Initial Combined Balance: ${initialBalances.combinedBalance}`);
	} else {
		logger.info('Failed to fetch initial balances.');
	}
})();

logger.info(`RPC Provider is running on ${RPC_URL}`);
logger.info(`WebSocket server is running on ws://localhost:${PORT || 3003}`);
logger.info(`LSP Address: ${signer.address}`);

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
	logger.info('Client connected');

	// Get signer's balance info
	const signerBalanceInfo = await getSignerBalance();
	if (signerBalanceInfo) {
		logger.info('signerBalanceInfo', signerBalanceInfo);
	} else {
		logger.info('Failed to fetch balance.');
	}

	const uuid = uuidv4();
	sockets[uuid] = ws;

	const connectionResponse: ConnectionResponse = {
		serverStatus: serverState.serverStatus,
		serverConfig: providerConfig,
		uuid,
		message: 'Connected to server',
		signerActive: signerBalanceInfo.isSignerBalanceActive,
	};

	ws.send(JSON.stringify(connectionResponse));

	ws.on('message', async (message: string) => {
		logger.info('Received message:', message);
		const request: ClientRequest = JSON.parse(message);

		match(request)
			.with({ kind: KIND.INVOICE_SEND }, async (request) => {
				await processClientInvoiceRequest(request, ws, serverState);
			})
			.with({ kind: KIND.INITIATION_RECIEVE }, async (request) => {
				await processClientLightningReceiveRequest(request, ws, serverState);
			})
			.with({ kind: KIND.TX_HASH }, async (request) => {
				await handleTxHash(request, ws, serverState);
			})
			.otherwise((request) => {
				logger.warn('Unknown message kind:', request.kind);
			});
	});

	ws.on('close', () => logger.info('Client disconnected'));

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
			logger.info('No cached payments to process.');
			return;
		}
		logger.info(`Processing ${cachedPayments.length} cached payments...`);

		// Get signer's balance
		const signerBalance = await getSignerBalance();
		logger.info(`Signer's balance: ${signerBalance.toString()} wei`);

		for (const payment of cachedPayments) {
			try {
				logger.info(`Attempting to withdraw for contractId: ${payment.contractId}`);
				await htlcContract
					.withdraw(payment.contractId, '0x' + payment.secret)
					.then(async (tx) => {
						logger.log('Withdrawal Transaction Success:', tx);

						await prisma.transaction.update({
							where: { contractId: payment.contractId },
							data: {
								status: TransactionStatus.COMPLETED,
								date: new Date().toISOString(),
							},
						});
						// Update the channel balances after processing the invoice
						await updateChannelBalances(serverState.lnd);
						logger.info(`Successfully processed cached payment for contractId: ${payment.contractId}`);
						ws.send(JSON.stringify({ status: 'success', message: 'Invoice withdrawn successfully.' }));
					})
					.catch((error) => {
						logger.error(`Error with withdrawal for contractId ${payment.contractId}:`, error);
						// Handle retry logic or other actions as needed
					});
			} catch (error) {
				logger.error(`Error processing cached payment for contractId ${payment.contractId}:`, error);
			}
		}
	} catch (error) {
		logger.error('Error fetching cached payments:', error);
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
	logger.info(`HTTP server is running on http://localhost:${HTTP_PORT || 3002}`);
});
