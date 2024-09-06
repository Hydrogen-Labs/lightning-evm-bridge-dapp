import { ClientRequest, ConnectionResponse, KIND, ServerStatus, deployedContracts } from '@lightning-evm-bridge/shared';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import express from 'express';
import { authenticatedLndGrpc } from 'lightning';
import { match } from 'ts-pattern';
import { v4 as uuidv4 } from 'uuid';
import * as WebSocket from 'ws';
import logger from './logger';
import { providerConfig } from './provider.config';
import transactionsRouter from './routes/transactions';
import { CachedPayment, ServerState } from './types/types';
import { checkChannelBalances, updateChannelBalances } from './utils/balanceUtils';
import { handleTxHash } from './utils/handleTxHash';
import { processClientLightningReceiveRequest } from './utils/lightningRecieveUtils';
import { processClientInvoiceRequest } from './utils/lightningSendUtils';
import { processCachedPayments } from './utils/paymentUtils';
import { getSignerBalance } from './utils/signerUtils';
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

let sockets: { [id: string]: WebSocket } = {};
let cachedPayments: CachedPayment[] = [];
let pendingContracts: string[] = [];

// Fetch initial balances at the start
(async () => {
	await updateChannelBalances(lnd);
	await checkChannelBalances(lnd);
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
	setInterval(() => processCachedPayments(ws, lnd), 30000);
});

const prisma = new PrismaClient();

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
