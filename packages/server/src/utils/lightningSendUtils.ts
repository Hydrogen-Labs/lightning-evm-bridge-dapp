import { ContractDetails, InvoiceRequest } from '@lightning-evm-bridge/shared';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { decode } from 'bolt11';
import { ethers } from 'ethers';
import { pay } from 'lightning';
import * as WebSocket from 'ws';
import logger from '../logger';
import prisma from '../prismaClient';
import { providerConfig } from '../provider.config';
import { ServerState } from '../types/types';
import { updateChannelBalances } from './balanceUtils';
import { getContractDetails, validateLnInvoiceAndContract } from './validation';

export async function processClientInvoiceRequest(request: InvoiceRequest, ws: WebSocket, serverState: ServerState) {
	if (serverState.pendingContracts.includes(request.contractId)) {
		ws.send(
			JSON.stringify({
				status: 'error',
				message: 'Contract is already being processed.',
			})
		);
		return;
	}
	serverState.pendingContracts.push(request.contractId);
	try {
		await processInvoiceRequest(request, ws, serverState);
	} catch (error) {
		logger.error('Error processing message:', error);
		ws.send(JSON.stringify({ status: 'error', message: 'Invalid request' }));
	}
	serverState.pendingContracts = serverState.pendingContracts.filter((c) => c !== request.contractId);
}

async function processInvoiceRequest(request: InvoiceRequest, ws: WebSocket, serverState: ServerState) {
	if (!request.contractId || !request.lnInvoice) {
		ws.send(JSON.stringify({ status: 'error', message: 'Invalid Invoice Request' }));
		return;
	}

	logger.info('Invoice Request Received:', request);

	// Check if LND_MACAROON and LND_SOCKET are empty to simulate mock mode
	if (!process.env.LND_MACAROON && !process.env.LND_SOCKET) {
		logger.info('Mock Server Mode: Simulating payment success');

		// Simulate processing delay
		await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay for realism

		// Directly respond with a simulated success message
		ws.send(
			JSON.stringify({
				status: 'success',
				message: 'Invoice paid successfully in mock mode.',
			})
		);

		// Exit early since we're in mock mode
		return;
	}

	try {
		const contractExists = await serverState.htlcContract.haveContract(request.contractId);
		if (!contractExists) {
			ws.send(JSON.stringify({ status: 'error', message: 'Contract does not exist.' }));
			return;
		}

		const lnInvoiceDetails = decode(request.lnInvoice);
		logger.info('LN Invoice Details:', lnInvoiceDetails);

		const contractDetails: ContractDetails = await getContractDetails(request.contractId, serverState.htlcContract);
		logger.info('Contract Details:', contractDetails);

		const validation = validateLnInvoiceAndContract(lnInvoiceDetails, contractDetails);

		if (!validation.isValid) {
			logger.info('Invoice and Contract are invalid:', validation.message);
			ws.send(
				JSON.stringify({
					status: 'error',
					message: validation.message,
				})
			);
			return;
		}

		const transactionData = {
			status: TransactionStatus.PENDING,
			date: new Date().toISOString(),
			amount: lnInvoiceDetails.satoshis,
			txHash: request.txHash,
			contractId: request.contractId,
			hashLockTimestamp: lnInvoiceDetails.timeExpireDate,
			lnInvoice: lnInvoiceDetails.paymentRequest,
			userAddress: contractDetails.sender,
			transactionType: TransactionType.SENT,
		};

		// Save transaction to the database
		await prisma.transaction.create({
			data: transactionData,
		});

		ws.send(
			JSON.stringify({
				status: 'pending',
				message: 'Invoice pending.',
			})
		);

		logger.info('Invoice and Contract are valid, proceeding with payment');

		const paymentResponse = await pay({
			lnd: serverState.lnd,
			request: request.lnInvoice,
			max_fee: providerConfig.maxLNFee,
		});

		logger.info('Payment Response:', paymentResponse);

		// Critical point, if this withdraw fails, the LSP will lose funds
		await serverState.htlcContract
			.withdraw(request.contractId, '0x' + paymentResponse.secret)
			.then(async (tx: any) => {
				logger.info('Withdrawal Transaction:', tx);
				try {
					// Update the existing transaction in the database
					await prisma.transaction.update({
						where: { contractId: request.contractId },
						data: {
							status: TransactionStatus.COMPLETED,
							date: new Date().toISOString(),
						},
					});
					// Update the channel balances after processing the invoice
					await updateChannelBalances(serverState.lnd);
					ws.send(JSON.stringify({ status: 'success', message: 'Invoice withdrawn successfully.' }));
				} catch (error) {
					logger.error('Error updating transaction to COMPLETED:', error);
				}
			})
			.catch(async (error: any) => {
				logger.error('Withdrawal Error:', error);
				try {
					await prisma.transaction.update({
						where: { contractId: request.contractId },
						data: {
							status: TransactionStatus.CACHED,
							secret: paymentResponse.secret,
							date: new Date().toISOString(),
						},
					});
					logger.info('Cached payment added to the database.');
				} catch (dbError) {
					logger.error('Error caching payment:', dbError);
				}
			});
		logger.info('Payment processed successfully');
	} catch (error) {
		logger.error('Error during invoice processing:', error);
		try {
			// Check if the transaction exists
			const existingTransaction = await prisma.transaction.findUnique({
				where: { contractId: request.contractId },
			});

			if (existingTransaction) {
				// Update the transaction to FAILED status if it exists
				await prisma.transaction.update({
					where: { contractId: request.contractId },
					data: {
						status: TransactionStatus.FAILED,
						date: new Date().toISOString(),
					},
				});
				logger.info('Payment failed, transaction status updated to FAILED.');
			} else {
				// Create a new transaction with FAILED status if it doesn't exist
				const lnInvoiceDetails = decode(request.lnInvoice);
				const contractDetails: ContractDetails = await getContractDetails(request.contractId, serverState.htlcContract);
				await prisma.transaction.create({
					data: {
						status: TransactionStatus.FAILED,
						date: new Date().toISOString(),
						amount: lnInvoiceDetails.satoshis,
						txHash: request.txHash,
						contractId: request.contractId,
						hashLockTimestamp: lnInvoiceDetails.timeExpireDate,
						lnInvoice: lnInvoiceDetails.paymentRequest,
						userAddress: contractDetails.sender,
						transactionType: TransactionType.SENT,
					},
				});
				logger.info('Payment failed, new transaction created with FAILED status.');
			}
		} catch (error) {
			logger.error('Error updating/creating transaction to FAILED:', error);
		}
		ws.send(JSON.stringify({ status: 'error', message: 'Failed to process invoice.' }));
	}
}
