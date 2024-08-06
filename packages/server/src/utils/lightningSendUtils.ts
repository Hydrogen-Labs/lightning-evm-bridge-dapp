import { ContractDetails, InvoiceRequest } from '@lightning-evm-bridge/shared';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { decode } from 'bolt11';
import { ethers } from 'ethers';
import { pay } from 'lightning';
import * as WebSocket from 'ws';
import prisma from '../prismaClient';
import { providerConfig } from '../provider.config';
import { ServerState } from '../types/types';
import { getContractDetails, validateLnInvoiceAndContract } from './validation';

export async function processClientInvoiceRequest(request: InvoiceRequest, ws: WebSocket, serverState: ServerState, signerBalance: bigint) {
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
		console.error('Error processing message:', error);
		ws.send(JSON.stringify({ status: 'error', message: 'Invalid request' }));
	}
	serverState.pendingContracts = serverState.pendingContracts.filter((c) => c !== request.contractId);
}

async function processInvoiceRequest(request: InvoiceRequest, ws: WebSocket, serverState: ServerState) {
	if (!request.contractId || !request.lnInvoice) {
		ws.send(JSON.stringify({ status: 'error', message: 'Invalid Invoice Request' }));
		return;
	}

	console.log('Invoice Request Received:', request);

	// Check if LND_MACAROON and LND_SOCKET are empty to simulate mock mode
	if (!process.env.LND_MACAROON && !process.env.LND_SOCKET) {
		console.log('Mock Server Mode: Simulating payment success');

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
		const options = { gasPrice: ethers.parseUnits('0.001', 'gwei') };

		const contractExists = await serverState.htlcContract.haveContract(request.contractId);
		if (!contractExists) {
			ws.send(JSON.stringify({ status: 'error', message: 'Contract does not exist.' }));
			return;
		}

		const lnInvoiceDetails = decode(request.lnInvoice);
		console.log('LN Invoice Details:', lnInvoiceDetails);

		const contractDetails: ContractDetails = await getContractDetails(request.contractId, serverState.htlcContract);
		console.log('Contract Details:', contractDetails);

		const validation = validateLnInvoiceAndContract(lnInvoiceDetails, contractDetails);

		if (!validation.isValid) {
			console.log('Invoice and Contract are invalid:', validation.message);
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

		// Simulate processing delay
		// await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second delay for testing purposes

		console.log('Invoice and Contract are valid, proceeding with payment');

		const paymentResponse = await pay({
			lnd: serverState.lnd,
			request: request.lnInvoice,
			max_fee: providerConfig.maxLNFee,
		});

		console.log('Payment Response:', paymentResponse);
		if (paymentResponse) {
			try {
				// Update the existing transaction in the database
				await prisma.transaction.update({
					where: { contractId: request.contractId },
					data: {
						status: TransactionStatus.COMPLETED,
						date: new Date().toISOString(),
					},
				});
			} catch (error) {
				console.error('Error updating transaction to COMPLETED:', error);
			}
		} else {
			try {
				// Update the transaction to FAILED status
				await prisma.transaction.update({
					where: { contractId: request.contractId },
					data: {
						status: TransactionStatus.FAILED,
						date: new Date().toISOString(),
					},
				});
				console.log('Payment failed, transaction status updated to FAILED.');
			} catch (error) {
				console.error('Error updating transaction to FAILED:', error);
			}
		}

		ws.send(
			JSON.stringify({
				status: 'success',
				message: 'Invoice paid successfully.',
			})
		);
		// Critical point, if this withdraw fails, the LSP will lose funds
		// We should cache the paymentResponse.secret and request.contractId and retry the withdrawal if it fails
		await serverState.htlcContract
			.withdraw(request.contractId, '0x' + paymentResponse.secret) // remove options
			.then((tx: any) => {
				console.log('Withdrawal Transaction:', tx);
			})
			.catch(async (error: any) => {
				console.error('Withdrawal Error:', error);
				// serverState.cachedPayments.push({
				// 	contractId: request.contractId,
				// 	secret: paymentResponse.secret,
				// });

				// Check if the error code indicates insufficient funds
				if (error.code === 'INSUFFICIENT_FUNDS') {
					// Extract relevant information from the error message
					const balanceMatch = error.message.match(/balance (\d+)/);
					const overshotMatch = error.message.match(/overshot (\d+)/);

					if (balanceMatch && overshotMatch) {
						const currentBalance = BigInt(balanceMatch[1]);
						const overshotAmount = BigInt(overshotMatch[1]);

						// Calculate the required balance
						const requiredBalance = currentBalance + overshotAmount;

						try {
							await prisma.cachedPayment.create({
								data: {
									contractId: request.contractId,
									secret: paymentResponse.secret,
									requiredBalance: requiredBalance,
								},
							});
							console.log('Cached payment added to the database.');
						} catch (dbError) {
							console.error('Error caching payment:', dbError);
						}
					} else {
						console.error('Could not extract balance and overshot information from error message.');
					}
				} else {
					// Handle other errors accordingly
					console.error('An unexpected error occurred:', error);
				}
			});
		console.log('Payment processed successfully');
	} catch (error) {
		console.error('Error during invoice processing:', error);
		try {
			// Update the transaction to FAILED status
			await prisma.transaction.update({
				where: { contractId: request.contractId },
				data: {
					status: TransactionStatus.FAILED,
					date: new Date().toISOString(),
				},
			});
			console.log('Payment failed, transaction status updated to FAILED.');
		} catch (error) {
			console.error('Error updating transaction to FAILED:', error);
		}
		ws.send(JSON.stringify({ status: 'error', message: 'Failed to process invoice.' }));
	}
}
