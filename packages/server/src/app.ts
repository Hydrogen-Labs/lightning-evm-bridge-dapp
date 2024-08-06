import bodyParser from 'body-parser'; // Import body-parser
import cors from 'cors'; // Import cors
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import express from 'express'; // Import express
import { v4 as uuidv4 } from 'uuid';
import * as WebSocket from 'ws';
import transactionsRouter from './routes/transactions';

import { ClientRequest, ConnectionResponse, KIND, ServerStatus, deployedContracts } from '@lightning-evm-bridge/shared';
import { authenticatedLndGrpc, getChannels, getFailedPayments, getWalletInfo } from 'lightning';
import { match } from 'ts-pattern';
import { providerConfig } from './provider.config';
import { CachedPayment, ServerState } from './types/types';
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

// Initialize WebSocket services
const wss = new WebSocket.Server({
	port: Number(PORT) || 3003,
	clientTracking: true,
});

const { lnd } = authenticatedLndGrpc({
	cert: LND_TLS_CERT,
	macaroon: LND_MACAROON,
	socket: LND_SOCKET,
});

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
		// Convert to BigInt and return
		return BigInt(balanceWei.toString());
	} catch (error) {
		console.error('Error fetching balance:', error);
		return null; // Handle error scenario
	}
}

let sockets: { [id: string]: WebSocket } = {};
let cachedPayments: CachedPayment[] = [];
let pendingContracts: string[] = [];

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

wss.on('connection', (ws: WebSocket) => {
	console.log('Client connected');

	const uuid = uuidv4();
	sockets[uuid] = ws;

	const connectionResponse: ConnectionResponse = {
		serverStatus: serverState.serverStatus,
		serverConfig: providerConfig,
		uuid,
		message: 'Connected to server',
	};

	ws.send(JSON.stringify(connectionResponse));

	ws.on('message', async (message: string) => {
		console.log('Received message:', message);
		const request: ClientRequest = JSON.parse(message);

		// Extract and log the kind of the message
		console.log(`Message kind: ${request.kind}`);
		console.log(`Full message: ${JSON.stringify(request, null, 2)}`);

		// Get signer's balance
		const signerBalance = await getSignerBalance();

		match(request)
			.with({ kind: KIND.INVOICE_SEND }, async (request) => {
				await processClientInvoiceRequest(request, ws, serverState, signerBalance);
			})
			.with({ kind: KIND.INITIATION_RECIEVE }, async (request) => {
				await processClientLightningReceiveRequest(request, ws, serverState);
			})
			.with({ kind: KIND.TX_HASH }, async (request) => {
				await handleTxHash(request);
			})
			.otherwise((request) => {
				console.warn('Unknown message kind:', request.kind);
			});
	});

	ws.on('close', () => console.log('Client disconnected'));
});

const prisma = new PrismaClient();

async function processCachedPayments() {
	try {
		const cachedPayments = await prisma.cachedPayment.findMany();
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
				if (BigInt(signerBalance) < BigInt(payment.requiredBalance)) {
					console.log(`Insufficient balance for contractId: ${payment.contractId}, skipping...`);
					continue;
				}

				console.log(`Attempting to withdraw for contractId: ${payment.contractId}`);
				await htlcContract
					.withdraw(payment.contractId, '0x' + payment.secret)
					.then(async (tx) => {
						console.log('Withdrawal Transaction Success:', tx);

						await prisma.cachedPayment.delete({
							where: { contractId: payment.contractId },
						});
						console.log(`Successfully processed and removed payment for contractId: ${payment.contractId}`);
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

// Poll every 30 seconds
setInterval(processCachedPayments, 30000);

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
