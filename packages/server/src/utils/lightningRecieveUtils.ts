import {
	GWEIPERSAT,
	HodlInvoiceContractResponse,
	HodlInvoiceResponse,
	InitiationRequest,
	InitiationResponse,
	KIND,
	RelayResponse,
} from '@lightning-evm-bridge/shared';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { ethers } from 'ethers';
import { cancelHodlInvoice, createHodlInvoice, createInvoice, settleHodlInvoice, subscribeToInvoice } from 'lightning';
import * as WebSocket from 'ws';
import prisma from '../prismaClient';
import { providerConfig } from '../provider.config';
import { ServerState } from '../types/types';
import { getContractDetails } from './validation';

// Helper functions
function logError(context, error) {
	console.error(`Error in ${context}:`, error);
}

function sendWebSocketMessage(ws, message) {
	ws.send(JSON.stringify(message));
}

// Main processing functions
export async function processClientLightningReceiveRequest(request: InitiationRequest, ws: WebSocket, serverState: ServerState) {
	try {
		console.log('Creating initiation invoice');
		const invoice = await createInvoice({
			lnd: serverState.lnd,
			tokens: providerConfig.recieveBaseFee,
		});

		console.log('Initiation Invoice:', invoice);
		const initiationResponse: InitiationResponse = {
			lnInvoice: invoice.request,
		};

		console.log('Initiation Response:', initiationResponse);
		sendWebSocketMessage(ws, initiationResponse);

		const sub = subscribeToInvoice({
			lnd: serverState.lnd,
			id: invoice.id,
		});

		sub.on('invoice_updated', (invoice) => {
			handleSetupInvoiceUpdate(invoice, ws, sub, request, serverState, initiationResponse);
		});
		console.log('Subscribed to invoice updates');
	} catch (error) {
		logError('Creating Invoice', error);
		sendWebSocketMessage(ws, {
			status: 'error',
			message: 'Failed to create invoice.',
		});
	}
}

// Step 2: After the initiation invoice is paid
// a hodl invoice with the client's hashlock is created
async function handleSetupInvoiceUpdate(
	invoice: any,
	ws: WebSocket,
	sub: any,
	request: InitiationRequest,
	serverState: ServerState,
	initiationResponse: InitiationResponse
) {
	if (!invoice.is_confirmed) return;

	sub.removeAllListeners();
	const expiryTime = Math.floor(Date.now() / 1000) + 600;

	try {
		const hodlInvoice = await createHodlInvoice({
			lnd: serverState.lnd,
			id: request.hashlock,
			tokens: request.amount,
			expires_at: expiryTime.toString(),
		});

		const hodlInvoiceResponse: HodlInvoiceResponse = {
			kind: KIND.HODL_RES,
			lnInvoice: hodlInvoice.request,
		};

		sendWebSocketMessage(ws, hodlInvoiceResponse);

		subscribeToHodlInvoice(hodlInvoice.id, request, serverState, ws, expiryTime, initiationResponse);
	} catch (error) {
		logError('Creating Hodl Invoice', error);
		sendWebSocketMessage(ws, {
			status: 'error',
			message: 'Failed to create Hodl invoice.',
		});
	}
}

function subscribeToHodlInvoice(
	invoiceId: string,
	request: InitiationRequest,
	serverState: ServerState,
	ws: WebSocket,
	expiryTime: number,
	initiationResponse: InitiationResponse
) {
	const sub = subscribeToInvoice({
		lnd: serverState.lnd,
		id: invoiceId,
	});

	sub.on('invoice_updated', (invoice) => {
		if (invoice.is_held) {
			processPaidHodlInvoice(request, serverState, expiryTime, invoiceId, ws, initiationResponse);
			sub.removeAllListeners();
		}
	});
}

// Step 3: User pays the hodl invoice to claim the contract
// Once the hodl invoice is paid, scan the blockchain for the preimage
// settle the invoice via the lnd api
async function processPaidHodlInvoice(
	request: InitiationRequest,
	serverState: ServerState,
	expiryTime: number,
	id: string,
	ws: WebSocket,
	initiationResponse: InitiationResponse
) {
	const options = {
		// gasPrice: ethers.parseUnits("0.001", "gwei"),
		value: BigInt(request.amount * GWEIPERSAT),
	};

	var contractId: string | undefined = undefined;

	console.log('Creating on-chain contract');

	await serverState.htlcContract
		.newContract(request.recipient, '0x' + request.hashlock, BigInt(expiryTime), options)
		.then(async (tx: any) => {
			await tx.wait().then(async (res) => {
				console.log('Contract Logs:', res.logs[0].args[0]);
				contractId = res.logs[0].args[0];
				const hodlInvoiceContractResponse: HodlInvoiceContractResponse = {
					kind: KIND.HODL_CONTRACT_RES,
					contractId,
				};
				ws.send(JSON.stringify(hodlInvoiceContractResponse));
			});
		})
		.catch((error: any) => {
			console.error('Contract Error:', error);
			ws.send(
				JSON.stringify({
					status: 'error',
					message: 'Failed to create contract.',
				})
			);
			return;
		});
	console.log('Processing paid hodl invoice');

	while (true && contractId) {
		console.log('Checking hodl invoice status');

		try {
			const now = Math.floor(Date.now() / 1000);
			if (now > expiryTime) {
				console.log('Expiry time reached, cancelling hodl invoice');
				const res = await cancelHodlInvoice({
					lnd: serverState.lnd,
					id,
				});
				console.log('Hodl Invoice Cancelled:', res);
				return;
			}

			const contractDetails = await getContractDetails(contractId, serverState.htlcContract);

			console.log('Contract Details:', contractDetails);
			if (contractDetails.withdrawn) {
				console.log('Preimage found, settling hodl invoice');

				await settleHodlInvoice({
					lnd: serverState.lnd,
					secret: contractDetails.preimage.substring(2),
				});

				try {
					const transactionData = {
						status: TransactionStatus.COMPLETED,
						date: new Date().toISOString(),
						amount: Number(contractDetails.amount),
						txHash: '',
						contractId: contractId,
						hashLockTimestamp: 0,
						lnInvoice: initiationResponse.lnInvoice,
						userAddress: contractDetails.receiver,
						transactionType: TransactionType.RECEIVED,
					};

					// Save transaction to the database
					await prisma.transaction.create({
						data: transactionData,
					});
				} catch (error) {
					console.error('Error creating new transaction:', error);
				}

				return;
			}
		} catch (error) {
			console.error('Error processing hodl invoice:', error);
		}
		// wait for 5 seconds before checking again
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
}
